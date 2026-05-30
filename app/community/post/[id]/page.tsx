'use client'

import { useEffect, useState } from 'react'
import { supabase } from '../../../lib/supabase'
import { useParams, useRouter } from 'next/navigation'
import Link from 'next/link'
import PageHeader from '../../../components/PageHeader'
import { useFeedback } from '../../../components/Feedback'

const POST_TYPES: Record<string, { label: string; style: string }> = {
  tip:       { label: 'เคล็ดลับ',  style: 'bg-[#E6F9F7] text-[#2ABFAB]' },
  question:  { label: 'คำถาม',     style: 'bg-amber-50 text-amber-600' },
  recommend: { label: 'แนะนำ',     style: 'bg-violet-50 text-violet-600' },
  diy:       { label: 'DIY',       style: 'bg-green-50 text-green-600' },
  review:    { label: 'รีวิว',     style: 'bg-sky-50 text-sky-600' },
}

function timeAgo(dateStr: string) {
  const diff = Date.now() - new Date(dateStr).getTime()
  const mins  = Math.floor(diff / 60000)
  const hours = Math.floor(diff / 3600000)
  const days  = Math.floor(diff / 86400000)
  if (mins < 1)   return 'เมื่อกี้'
  if (mins < 60)  return `${mins} นาทีที่แล้ว`
  if (hours < 24) return `${hours} ชั่วโมงที่แล้ว`
  if (days < 7)   return `${days} วันที่แล้ว`
  return new Date(dateStr).toLocaleDateString('th-TH', { day: 'numeric', month: 'short', year: 'numeric' })
}

export default function PostDetailPage() {
  const { id }   = useParams()
  const router   = useRouter()
  const { toast, confirm } = useFeedback()

  const [post, setPost]           = useState<any>(null)
  const [comments, setComments]   = useState<any[]>([])
  const [loading, setLoading]     = useState(true)
  const [myId, setMyId]           = useState<string | null>(null)
  const [liked, setLiked]         = useState(false)
  const [likeCount, setLikeCount] = useState(0)
  const [commentText, setCommentText] = useState('')
  const [replyTo, setReplyTo]         = useState<any | null>(null)
  const [sendingComment, setSendingComment] = useState(false)
  const [reporting, setReporting]     = useState(false)
  const [reportReason, setReportReason] = useState('')
  const [sendingReport, setSendingReport] = useState(false)

  useEffect(() => { init() }, [id])

  const init = async () => {
    const { data: { user } } = await supabase.auth.getUser()
    if (user) setMyId(user.id)

    const [{ data: postData }, { data: commentsData }, { count: likes }, reactionData] = await Promise.all([
      supabase.from('posts').select('*, profiles(id, display_name, avatar_url), categories(name)').eq('id', id).single(),
      supabase.from('comments').select('*, profiles(id, display_name, avatar_url)')
        .eq('post_id', id).eq('status', 'published').order('created_at', { ascending: true }),
      supabase.from('reactions').select('*', { count: 'exact', head: true }).eq('entity_type', 'post').eq('entity_id', id),
      user ? supabase.from('reactions').select('id').eq('user_id', user.id).eq('entity_type', 'post').eq('entity_id', id).maybeSingle() : { data: null },
    ])

    setPost(postData)
    setComments(commentsData || [])
    setLikeCount(likes || 0)
    setLiked(!!reactionData.data)
    setLoading(false)
  }

  const handleReport = async () => {
    if (!reportReason) return toast('กรุณาเลือกเหตุผล', 'error')
    setSendingReport(true)
    await supabase.from('post_reports').insert({
      post_id: id,
      reporter_id: myId,
      reason: reportReason,
    })
    setSendingReport(false)
    setReporting(false)
    setReportReason('')
    toast('รายงานแล้ว ขอบคุณที่ช่วยดูแลชุมชน', 'success')
  }

  const handleShare = async () => {
    const url = `${window.location.origin}/community/post/${id}`
    if (navigator.share) {
      await navigator.share({ title: post?.title, text: post?.content?.slice(0, 80), url })
    } else {
      await navigator.clipboard.writeText(url)
      toast('คัดลอกลิงก์แล้ว', 'success')
    }
  }

  const handleLike = async () => {
    if (!myId) return toast('กรุณาเข้าสู่ระบบก่อน', 'error')
    if (liked) {
      await supabase.from('reactions').delete().eq('user_id', myId).eq('entity_type', 'post').eq('entity_id', id)
      setLiked(false); setLikeCount(c => c - 1)
    } else {
      await supabase.from('reactions').insert({ user_id: myId, entity_type: 'post', entity_id: id, type: 'like' })
      setLiked(true); setLikeCount(c => c + 1)
    }
  }

  const handleComment = async () => {
    if (!commentText.trim()) return
    if (!myId) return toast('กรุณาเข้าสู่ระบบก่อน', 'error')
    setSendingComment(true)
    const { error } = await supabase.from('comments').insert({
      post_id: id,
      user_id: myId,
      parent_id: replyTo?.id || null,
      content: commentText.trim(),
    })
    if (error) toast(error.message, 'error')
    else {
      setCommentText(''); setReplyTo(null)
      const { data } = await supabase.from('comments').select('*, profiles(id, display_name, avatar_url)')
        .eq('post_id', id).eq('status', 'published').order('created_at', { ascending: true })
      setComments(data || [])
    }
    setSendingComment(false)
  }

  const handleDeletePost = async () => {
    if (!await confirm({ title: 'ลบโพสนี้?', message: 'ความคิดเห็นทั้งหมดจะหายไปด้วย', confirmText: 'ลบ', danger: true })) return
    await supabase.from('posts').update({ status: 'hidden' }).eq('id', id)
    toast('ลบโพสแล้ว', 'success')
    router.push('/community')
  }

  const handleDeleteComment = async (commentId: string) => {
    if (!await confirm({ title: 'ลบความคิดเห็นนี้?', confirmText: 'ลบ', danger: true })) return
    const { error } = await supabase.from('comments').delete().eq('id', commentId).eq('user_id', myId!)
    if (error) {
      toast('ลบไม่สำเร็จ: ' + error.message, 'error')
    } else {
      setComments(prev => prev.filter(c => c.id !== commentId && c.parent_id !== commentId))
    }
  }

  const topComments  = comments.filter(c => !c.parent_id)
  const getReplies   = (parentId: string) => comments.filter(c => c.parent_id === parentId)

  if (loading) return (
    <div className="max-w-md mx-auto min-h-screen bg-slate-50 font-sans">
      <div className="h-14 bg-[#1B2F5E]" />
      <div className="px-5 pt-5 space-y-3">
        <div className="bg-white rounded-3xl p-5 animate-pulse border border-slate-100">
          <div className="flex gap-3 mb-4">
            <div className="w-10 h-10 rounded-xl bg-slate-100 flex-shrink-0" />
            <div className="flex-1 space-y-2">
              <div className="h-3 w-1/3 bg-slate-100 rounded" />
              <div className="h-2.5 w-1/4 bg-slate-100 rounded" />
            </div>
          </div>
          <div className="h-5 w-3/4 bg-slate-100 rounded mb-3" />
          <div className="space-y-2">
            <div className="h-3 bg-slate-100 rounded" />
            <div className="h-3 bg-slate-100 rounded" />
            <div className="h-3 w-2/3 bg-slate-100 rounded" />
          </div>
        </div>
      </div>
    </div>
  )

  if (!post) return (
    <div className="max-w-md mx-auto min-h-screen bg-slate-50 font-sans">
      <PageHeader title="โพส" backHref="/community" />
      <div className="text-center py-20 text-slate-400">ไม่พบโพสนี้</div>
    </div>
  )

  const typeInfo = POST_TYPES[post.type]

  return (
    <div className="max-w-md mx-auto min-h-screen bg-slate-50 font-sans pb-32">

      <PageHeader title="โพส" backHref="/community" />

      <div className="px-5 pt-5 space-y-3">

        {/* Post Card */}
        <div className="bg-white rounded-3xl p-5 shadow-sm border border-slate-100">

          {/* Author */}
          <div className="flex items-center gap-3 mb-4">
            <div className="w-10 h-10 rounded-xl overflow-hidden bg-[#E6F9F7] flex-shrink-0 flex items-center justify-center">
              {post.profiles?.avatar_url
                ? <img src={post.profiles.avatar_url} className="w-full h-full object-cover" alt="" />
                : <span className="text-[#2ABFAB] font-bold">{(post.profiles?.display_name || '?')[0]?.toUpperCase()}</span>
              }
            </div>
            <Link href={`/community/profile/${post.profiles?.id}`} className="flex-1">
              <p className="text-slate-800 font-bold text-sm">{post.profiles?.display_name || 'ไม่ระบุชื่อ'}</p>
              <p className="text-slate-400 text-[11px]">{timeAgo(post.created_at)}</p>
            </Link>
            <div className="flex items-center gap-2">
              {typeInfo && <span className={`text-[10px] font-bold px-2.5 py-1 rounded-xl ${typeInfo.style}`}>{typeInfo.label}</span>}
              {myId === post.user_id && (
                <div className="flex items-center gap-2">
                  <Link href={`/community/edit/${id}`}
                    className="text-slate-300 hover:text-blue-500 transition-all">
                    <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                      <path d="M11 4H4a2 2 0 00-2 2v14a2 2 0 002 2h14a2 2 0 002-2v-7"/>
                      <path d="M18.5 2.5a2.121 2.121 0 013 3L12 15l-4 1 1-4 9.5-9.5z"/>
                    </svg>
                  </Link>
                  <button onClick={handleDeletePost} className="text-slate-300 hover:text-red-400 transition-all">
                    <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                      <path d="M3 6h18"/><path d="M19 6v14a2 2 0 01-2 2H7a2 2 0 01-2-2V6m3 0V4a2 2 0 012-2h4a2 2 0 012 2v2"/>
                    </svg>
                  </button>
                </div>
              )}
            </div>
          </div>

          {/* Title + Content */}
          <h2 className="text-slate-800 font-bold text-base mb-2 leading-snug">{post.title}</h2>
          <p className="text-slate-600 text-sm leading-relaxed whitespace-pre-wrap">{post.content}</p>

          {/* Image */}
          {post.metadata?.image_url && (
            <div className="mt-3 rounded-2xl overflow-hidden border border-slate-100">
              <img src={post.metadata.image_url} alt="" className="w-full object-cover max-h-72" />
            </div>
          )}

          {/* Category + Tags */}
          <div className="flex flex-wrap gap-1.5 mt-3">
            {post.categories && (
              <span className="text-[10px] bg-slate-50 text-slate-500 px-2.5 py-1 rounded-lg border border-slate-100 font-medium">{post.categories.name}</span>
            )}
            {post.tags?.map((tag: string) => (
              <span key={tag} className="text-[10px] bg-slate-50 text-slate-400 px-2 py-0.5 rounded-lg border border-slate-100">#{tag}</span>
            ))}
          </div>

          {/* Actions */}
          <div className="flex items-center gap-2 mt-4 pt-4 border-t border-slate-50">
            <button onClick={handleLike}
              className={`flex items-center gap-2 px-4 py-2 rounded-xl font-bold text-sm transition-all active:scale-95 ${
                liked ? 'bg-red-50 text-red-500' : 'bg-slate-50 text-slate-400'
              }`}>
              <svg width="16" height="16" viewBox="0 0 24 24"
                fill={liked ? 'currentColor' : 'none'}
                stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                <path d="M20.84 4.61a5.5 5.5 0 00-7.78 0L12 5.67l-1.06-1.06a5.5 5.5 0 00-7.78 7.78l1.06 1.06L12 21.23l7.78-7.78 1.06-1.06a5.5 5.5 0 000-7.78z"/>
              </svg>
              {liked ? 'ถูกใจแล้ว' : 'ถูกใจ'} · {likeCount}
            </button>
            <span className="text-slate-400 text-sm">{comments.length} ความคิดเห็น</span>
            <div className="ml-auto flex items-center gap-1">
              {/* Share */}
              <button onClick={handleShare}
                className="w-9 h-9 flex items-center justify-center rounded-xl bg-slate-50 text-slate-400 active:bg-slate-100 transition-all">
                <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                  <circle cx="18" cy="5" r="3"/><circle cx="6" cy="12" r="3"/><circle cx="18" cy="19" r="3"/>
                  <line x1="8.59" y1="13.51" x2="15.42" y2="17.49"/><line x1="15.41" y1="6.51" x2="8.59" y2="10.49"/>
                </svg>
              </button>
              {/* Report — แสดงเฉพาะโพสคนอื่น */}
              {myId && myId !== post?.user_id && (
                <button onClick={() => setReporting(true)}
                  className="w-9 h-9 flex items-center justify-center rounded-xl bg-slate-50 text-slate-400 active:bg-slate-100 transition-all">
                  <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                    <path d="M4 15s1-1 4-1 5 2 8 2 4-1 4-1V3s-1 1-4 1-5-2-8-2-4 1-4 1z"/><line x1="4" y1="22" x2="4" y2="15"/>
                  </svg>
                </button>
              )}
            </div>
          </div>
        </div>

        {/* Comments */}
        <div className="space-y-2">
          <h3 className="text-slate-500 text-xs font-bold uppercase tracking-widest ml-1">ความคิดเห็น ({topComments.length})</h3>

          {topComments.length === 0 && (
            <div className="bg-white rounded-2xl p-5 text-center border border-dashed border-slate-200">
              <p className="text-slate-400 text-sm">ยังไม่มีความคิดเห็น เป็นคนแรกที่แสดงความคิดเห็น</p>
            </div>
          )}

          {topComments.map(comment => (
            <div key={comment.id}>
              {/* Top-level comment */}
              <div className="bg-white rounded-2xl p-4 shadow-sm border border-slate-100">
                <div className="flex items-start gap-2.5">
                  <div className="w-8 h-8 rounded-xl overflow-hidden bg-[#E6F9F7] flex-shrink-0 flex items-center justify-center">
                    {comment.profiles?.avatar_url
                      ? <img src={comment.profiles.avatar_url} className="w-full h-full object-cover" alt="" />
                      : <span className="text-[#2ABFAB] font-bold text-xs">{(comment.profiles?.display_name || '?')[0]?.toUpperCase()}</span>
                    }
                  </div>
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2 mb-1">
                      <p className="text-slate-800 font-bold text-xs">{comment.profiles?.display_name || 'ไม่ระบุชื่อ'}</p>
                      <p className="text-slate-400 text-[10px]">{timeAgo(comment.created_at)}</p>
                    </div>
                    <p className="text-slate-600 text-sm leading-relaxed">{comment.content}</p>
                    <div className="flex items-center gap-3 mt-2">
                      <button onClick={() => setReplyTo(comment)}
                        className="text-slate-400 text-[11px] font-bold hover:text-blue-500 transition-all">
                        ตอบกลับ
                      </button>
                      {myId === comment.user_id && (
                        <button onClick={() => handleDeleteComment(comment.id)}
                          className="text-slate-300 text-[11px] font-bold hover:text-red-400 transition-all">
                          ลบ
                        </button>
                      )}
                    </div>
                  </div>
                </div>
              </div>

              {/* Replies */}
              {getReplies(comment.id).map(reply => (
                <div key={reply.id} className="ml-8 mt-1.5">
                  <div className="bg-slate-50 rounded-2xl p-3.5 border border-slate-100">
                    <div className="flex items-start gap-2.5">
                      <div className="w-7 h-7 rounded-lg overflow-hidden bg-[#E6F9F7] flex-shrink-0 flex items-center justify-center">
                        {reply.profiles?.avatar_url
                          ? <img src={reply.profiles.avatar_url} className="w-full h-full object-cover" alt="" />
                          : <span className="text-[#2ABFAB] font-bold text-[10px]">{(reply.profiles?.display_name || '?')[0]?.toUpperCase()}</span>
                        }
                      </div>
                      <div className="flex-1">
                        <div className="flex items-center gap-2 mb-0.5">
                          <p className="text-slate-800 font-bold text-xs">{reply.profiles?.display_name || 'ไม่ระบุชื่อ'}</p>
                          <p className="text-slate-400 text-[10px]">{timeAgo(reply.created_at)}</p>
                        </div>
                        <p className="text-slate-600 text-xs leading-relaxed">{reply.content}</p>
                        {myId === reply.user_id && (
                          <button onClick={() => handleDeleteComment(reply.id)}
                            className="text-slate-300 text-[10px] font-bold hover:text-red-400 transition-all mt-1">
                            ลบ
                          </button>
                        )}
                      </div>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          ))}
        </div>
      </div>

      {/* Comment Input — fixed at bottom */}
      <div className="fixed bottom-0 left-1/2 -translate-x-1/2 w-full max-w-md bg-white border-t border-slate-100 px-4 py-3 z-40">
        {replyTo && (
          <div className="flex items-center justify-between bg-[#E6F9F7] rounded-xl px-3 py-1.5 mb-2">
            <p className="text-[#2ABFAB] text-xs font-medium">ตอบกลับ {replyTo.profiles?.display_name}</p>
            <button onClick={() => setReplyTo(null)} className="text-[#2ABFAB] text-xs font-bold">ยกเลิก</button>
          </div>
        )}
        <div className="flex gap-2">
          <input
            value={commentText}
            onChange={e => setCommentText(e.target.value)}
            onKeyDown={e => { if (e.key === 'Enter' && !e.shiftKey) { e.preventDefault(); handleComment() } }}
            placeholder={replyTo ? `ตอบกลับ ${replyTo.profiles?.display_name}...` : 'แสดงความคิดเห็น...'}
            className="flex-1 bg-slate-50 rounded-2xl px-4 py-2.5 text-sm outline-none border-2 border-transparent focus:border-[#2ABFAB] transition-all"
          />
          <button onClick={handleComment} disabled={!commentText.trim() || sendingComment}
            className="w-10 h-10 bg-[#1B2F5E] rounded-2xl flex items-center justify-center flex-shrink-0 disabled:opacity-40 active:scale-90 transition-all">
            <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="white" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
              <line x1="22" y1="2" x2="11" y2="13"/><polygon points="22 2 15 22 11 13 2 9 22 2"/>
            </svg>
          </button>
        </div>
      </div>

      {/* Report Modal */}
      {reporting && (
        <div className="fixed inset-0 bg-black/40 z-50 flex items-center justify-center p-5" onClick={() => setReporting(false)}>
          <div className="bg-white rounded-3xl p-6 w-full max-w-sm shadow-xl" onClick={e => e.stopPropagation()}>
            <h2 className="text-slate-800 font-bold text-base mb-1">รายงานโพสนี้</h2>
            <p className="text-slate-400 text-xs mb-4">เลือกเหตุผลที่ตรงกับปัญหาที่พบ</p>
            <div className="space-y-2 mb-5">
              {[
                'เนื้อหาไม่เหมาะสม',
                'สแปมหรือโฆษณา',
                'ข้อมูลเท็จหรือทำให้เข้าใจผิด',
                'ละเมิดความเป็นส่วนตัว',
                'อื่นๆ',
              ].map(r => (
                <button key={r} onClick={() => setReportReason(r)}
                  className={`w-full text-left px-4 py-3 rounded-2xl border-2 text-sm font-medium transition-all ${
                    reportReason === r
                      ? 'border-red-400 bg-red-50 text-red-600'
                      : 'border-slate-100 bg-slate-50 text-slate-600'
                  }`}>
                  {r}
                </button>
              ))}
            </div>
            <div className="flex gap-2">
              <button onClick={() => { setReporting(false); setReportReason('') }}
                className="flex-1 py-3 rounded-2xl bg-slate-100 text-slate-500 font-bold text-sm">
                ยกเลิก
              </button>
              <button onClick={handleReport} disabled={!reportReason || sendingReport}
                className="flex-1 py-3 rounded-2xl bg-red-500 text-white font-bold text-sm disabled:opacity-50 active:scale-95 transition-all flex items-center justify-center gap-2">
                {sendingReport && <div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin" />}
                รายงาน
              </button>
            </div>
          </div>
        </div>
      )}

    </div>
  )
}

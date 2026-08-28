"use client";

import React, { useState, useEffect } from "react";
import Link from "next/link";
import Image from "next/image";
import { motion, AnimatePresence } from "framer-motion";
import { db } from "@/lib/firebase";
import {
  doc,
  setDoc,
  deleteDoc,
  updateDoc,
  getDoc,
  collection,
  addDoc,
  getDocs,
  query,
  orderBy,
  serverTimestamp,
  increment,
} from "firebase/firestore";
import {
  Heart,
  MessageCircle,
  Bookmark,
  Share2,
  MapPin,
  CheckCircle,
  ChevronLeft,
  ChevronRight,
  Send,
  Trash2,
  Clock,
  MoreVertical,
} from "lucide-react";
import toast from "react-hot-toast";

export function PostCard({ post, currentUserId, onDelete }) {
  const [liked, setLiked] = useState(false);
  const [bookmarked, setBookmarked] = useState(false);
  const [likesCount, setLikesCount] = useState(post?.likesCount || 0);
  const [currentImgIndex, setCurrentImgIndex] = useState(0);
  const [commentDrawerOpen, setCommentDrawerOpen] = useState(false);
  const [comments, setComments] = useState([]);
  const [newComment, setNewComment] = useState("");
  const [submittingComment, setSubmittingComment] = useState(false);
  const [menuOpen, setMenuOpen] = useState(false);

  const images =
    post?.images && post.images.length > 0 ? post.images : post?.imageUrl ? [post.imageUrl] : [];

  const isOwner = currentUserId && (post?.userId === currentUserId || post?.businessId === currentUserId);

  // Check initial like & bookmark status from Firestore subcollections
  useEffect(() => {
    async function checkUserInteractions() {
      if (!currentUserId || !post?.id) return;

      try {
        const likeRef = doc(db, "posts", post.id, "likes", currentUserId);
        const likeSnap = await getDoc(likeRef);
        setLiked(likeSnap.exists());
      } catch (err) {
        console.warn("Error checking post like doc:", err.message);
      }

      try {
        const bookmarkRef = doc(db, "users", currentUserId, "bookmarks", post.id);
        const bookmarkSnap = await getDoc(bookmarkRef);
        setBookmarked(bookmarkSnap.exists());
      } catch (err) {
        console.warn("Error checking post bookmark doc:", err.message);
      }
    }

    checkUserInteractions();
  }, [post?.id, currentUserId]);

  // Fetch comments from Firestore when comment drawer opens
  useEffect(() => {
    async function fetchComments() {
      if (!commentDrawerOpen || !post?.id) return;
      try {
        const q = query(
          collection(db, "posts", post.id, "comments"),
          orderBy("createdAt", "desc")
        );
        const snap = await getDocs(q);
        const fetched = snap.docs.map((d) => ({
          id: d.id,
          ...d.data(),
        }));
        setComments(fetched);
      } catch (err) {
        console.warn("Error fetching comments:", err.message);
      }
    }

    fetchComments();
  }, [commentDrawerOpen, post?.id]);

  const handleLikeToggle = async () => {
    if (!currentUserId) {
      toast.error("Please sign in to like posts.");
      return;
    }

    const postRef = doc(db, "posts", post.id);
    const likeRef = doc(db, "posts", post.id, "likes", currentUserId);

    if (liked) {
      setLiked(false);
      setLikesCount((prev) => Math.max(0, prev - 1));
      try {
        await deleteDoc(likeRef);
        await updateDoc(postRef, { likesCount: increment(-1) });
      } catch (err) {
        console.error("Error removing like:", err);
      }
    } else {
      setLiked(true);
      setLikesCount((prev) => prev + 1);
      toast.success("Liked post!");
      try {
        await setDoc(likeRef, {
          userId: currentUserId,
          createdAt: serverTimestamp(),
        });
        await updateDoc(postRef, { likesCount: increment(1) });
      } catch (err) {
        console.error("Error adding like:", err);
      }
    }
  };

  const handleBookmarkToggle = async () => {
    if (!currentUserId) {
      toast.error("Please sign in to save posts.");
      return;
    }

    const bookmarkRef = doc(db, "users", currentUserId, "bookmarks", post.id);

    if (bookmarked) {
      setBookmarked(false);
      toast.success("Removed from saved posts");
      try {
        await deleteDoc(bookmarkRef);
      } catch (err) {
        console.error("Error deleting bookmark:", err);
      }
    } else {
      setBookmarked(true);
      toast.success("Post saved!");
      try {
        await setDoc(bookmarkRef, {
          postId: post.id,
          savedAt: serverTimestamp(),
        });
      } catch (err) {
        console.error("Error saving bookmark:", err);
      }
    }
  };

  const handleShare = async () => {
    const shareUrl = typeof window !== "undefined" ? window.location.href : "";
    if (navigator.share) {
      try {
        await navigator.share({
          title: post?.businessName || "Thikana Post",
          text: post?.caption || "Check out this update on Thikana!",
          url: shareUrl,
        });
      } catch {
        // User cancelled
      }
    } else {
      navigator.clipboard.writeText(shareUrl);
      toast.success("Link copied to clipboard!");
    }
  };

  const handleAddComment = async (e) => {
    e.preventDefault();
    if (!newComment.trim() || !post?.id) return;

    if (!currentUserId) {
      toast.error("Please sign in to comment.");
      return;
    }

    setSubmittingComment(true);
    try {
      const commentData = {
        text: newComment.trim(),
        userId: currentUserId,
        userDisplayName: "User",
        createdAt: serverTimestamp(),
      };

      const docRef = await addDoc(collection(db, "posts", post.id, "comments"), commentData);

      setComments((prev) => [
        { id: docRef.id, text: newComment.trim(), userDisplayName: "You", createdAtFormatted: "Just now" },
        ...prev,
      ]);

      setNewComment("");
      toast.success("Comment posted!");
    } catch (err) {
      console.error("Error adding comment:", err);
      toast.error("Failed to post comment.");
    } finally {
      setSubmittingComment(false);
    }
  };

  const handleDeletePost = async () => {
    if (!post?.id) return;
    if (confirm("Are you sure you want to delete this post?")) {
      try {
        await deleteDoc(doc(db, "posts", post.id));
        toast.success("Post deleted.");
        if (onDelete) onDelete(post.id);
      } catch (err) {
        console.error("Error deleting post:", err);
        toast.error("Failed to delete post.");
      }
    }
  };

  return (
    <article className="bg-white dark:bg-[#1A1A1A] rounded-3xl border border-[#E5E0D8] dark:border-white/10 p-5 shadow-sm space-y-4 hover:border-[#C8B99A] dark:hover:border-white/20 transition-all duration-200">
      {/* 1. Header */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-3">
          <Link href={`/${post?.username || post?.businessId || "store"}`}>
            <div className="relative w-11 h-11 rounded-full overflow-hidden bg-[#1A1A1A] text-white flex items-center justify-center font-bold text-sm border border-gray-200 dark:border-white/10">
              {post?.businessAvatar ? (
                <Image
                  src={post.businessAvatar}
                  alt={post?.businessName || "Business"}
                  fill
                  className="object-cover"
                />
              ) : (
                <span>{(post?.businessName || "B").charAt(0).toUpperCase()}</span>
              )}
            </div>
          </Link>

          <div>
            <div className="flex items-center gap-1.5">
              <Link
                href={`/${post?.username || post?.businessId || "store"}`}
                className="font-black text-sm text-[#1A1A1A] dark:text-white hover:underline"
              >
                {post?.businessName || "Local Merchant"}
              </Link>
              {post?.isVerified && (
                <CheckCircle className="w-4 h-4 text-emerald-500 shrink-0" />
              )}
            </div>
            <div className="flex items-center gap-2 text-[11px] text-gray-500 font-medium mt-0.5">
              {post?.distanceFormatted && (
                <span className="flex items-center gap-1 text-[#4A7C6F] font-bold bg-[#4A7C6F]/10 px-2 py-0.5 rounded-full">
                  <MapPin className="w-3 h-3" />
                  {post.distanceFormatted} away
                </span>
              )}
            </div>
          </div>
        </div>

        <div className="flex items-center gap-2">
          {post?.category && (
            <span className="text-[11px] font-bold px-2.5 py-1 rounded-full bg-[#F4F1EA] dark:bg-white/10 text-[#1A1A1A] dark:text-gray-200 border border-[#E5E0D8] dark:border-white/5">
              {post.category}
            </span>
          )}

          {isOwner && (
            <div className="relative">
              <button
                onClick={() => setMenuOpen(!menuOpen)}
                className="p-1 rounded-lg hover:bg-gray-100 dark:hover:bg-white/10 text-gray-500"
              >
                <MoreVertical className="w-4 h-4" />
              </button>

              {menuOpen && (
                <div className="absolute right-0 mt-1 w-32 bg-white dark:bg-[#222] border border-gray-200 dark:border-white/10 rounded-xl shadow-lg py-1 z-20">
                  <button
                    onClick={handleDeletePost}
                    className="w-full text-left px-3 py-1.5 text-xs font-bold text-red-600 hover:bg-red-50 dark:hover:bg-red-950/20 flex items-center gap-1.5"
                  >
                    <Trash2 className="w-3.5 h-3.5" /> Delete
                  </button>
                </div>
              )}
            </div>
          )}
        </div>
      </div>

      {/* 2. Media Carousel */}
      {images.length > 0 && (
        <div className="relative rounded-2xl overflow-hidden bg-gray-100 dark:bg-black/40 group aspect-[4/3] sm:aspect-[16/10]">
          <Image
            src={images[currentImgIndex]}
            alt={post?.caption || "Post image"}
            fill
            className="object-cover transition-all duration-300"
          />

          {images.length > 1 && (
            <>
              <button
                onClick={() =>
                  setCurrentImgIndex((prev) => (prev > 0 ? prev - 1 : images.length - 1))
                }
                className="absolute left-3 top-1/2 -translate-y-1/2 p-2 rounded-full bg-black/50 text-white opacity-0 group-hover:opacity-100 transition hover:bg-black/70"
                aria-label="Previous image"
              >
                <ChevronLeft className="w-4 h-4" />
              </button>
              <button
                onClick={() =>
                  setCurrentImgIndex((prev) => (prev < images.length - 1 ? prev + 1 : 0))
                }
                className="absolute right-3 top-1/2 -translate-y-1/2 p-2 rounded-full bg-black/50 text-white opacity-0 group-hover:opacity-100 transition hover:bg-black/70"
                aria-label="Next image"
              >
                <ChevronRight className="w-4 h-4" />
              </button>

              <div className="absolute bottom-3 left-1/2 -translate-x-1/2 flex items-center gap-1.5 px-2.5 py-1 rounded-full bg-black/40 backdrop-blur-xs">
                {images.map((_, idx) => (
                  <button
                    key={idx}
                    onClick={() => setCurrentImgIndex(idx)}
                    className={`w-1.5 h-1.5 rounded-full transition-all ${
                      idx === currentImgIndex ? "w-4 bg-white" : "bg-white/50"
                    }`}
                  />
                ))}
              </div>
            </>
          )}
        </div>
      )}

      {/* 3. Caption */}
      {post?.caption && (
        <p className="text-xs sm:text-sm text-[#333] dark:text-gray-200 leading-relaxed font-normal">
          {post.caption}
        </p>
      )}

      {/* 4. Action Buttons (Like, Comment, Save/Bookmark, Share) */}
      <div className="flex items-center justify-between pt-2 border-t border-[#E5E0D8] dark:border-white/10">
        <div className="flex items-center gap-1 sm:gap-2">
          {/* Like button */}
          <button
            onClick={handleLikeToggle}
            className={`flex items-center gap-1.5 px-3 py-2 rounded-2xl text-xs font-bold transition ${
              liked
                ? "bg-rose-50 text-rose-600 dark:bg-rose-950/30 dark:text-rose-400"
                : "hover:bg-[#F4F1EA] dark:hover:bg-white/5 text-gray-600 dark:text-gray-300"
            }`}
          >
            <Heart className={`w-4 h-4 ${liked ? "fill-rose-600 dark:fill-rose-400" : ""}`} />
            <span>{likesCount}</span>
          </button>

          {/* Comment Drawer toggle */}
          <button
            onClick={() => setCommentDrawerOpen(!commentDrawerOpen)}
            className="flex items-center gap-1.5 px-3 py-2 rounded-2xl text-xs font-bold text-gray-600 dark:text-gray-300 hover:bg-[#F4F1EA] dark:hover:bg-white/5 transition"
          >
            <MessageCircle className="w-4 h-4" />
            <span>{comments.length}</span>
          </button>

          {/* Save / Bookmark Button */}
          <button
            onClick={handleBookmarkToggle}
            className={`p-2 rounded-2xl transition ${
              bookmarked
                ? "text-amber-600 dark:text-amber-400"
                : "text-gray-600 dark:text-gray-300 hover:bg-[#F4F1EA] dark:hover:bg-white/5"
            }`}
            title={bookmarked ? "Unsave post" : "Save post"}
          >
            <Bookmark className={`w-4 h-4 ${bookmarked ? "fill-amber-500" : ""}`} />
          </button>

          {/* Web Share Button */}
          <button
            onClick={handleShare}
            className="p-2 rounded-2xl text-gray-600 dark:text-gray-300 hover:bg-[#F4F1EA] dark:hover:bg-white/5 transition"
            title="Share post"
          >
            <Share2 className="w-4 h-4" />
          </button>
        </div>
      </div>

      {/* Comment Drawer */}
      <AnimatePresence>
        {commentDrawerOpen && (
          <motion.div
            initial={{ opacity: 0, height: 0 }}
            animate={{ opacity: 1, height: "auto" }}
            exit={{ opacity: 0, height: 0 }}
            className="pt-3 border-t border-[#E5E0D8] dark:border-white/10 space-y-3 overflow-hidden"
          >
            <form onSubmit={handleAddComment} className="flex gap-2">
              <input
                type="text"
                value={newComment}
                onChange={(e) => setNewComment(e.target.value)}
                placeholder="Write a comment..."
                className="flex-1 bg-[#F7F6F3] dark:bg-[#262626] border border-[#DDD8CF] dark:border-white/10 rounded-xl px-3 py-2 text-xs text-[#1A1A1A] dark:text-white outline-none focus:border-[#1A1A1A]"
              />
              <button
                type="submit"
                disabled={submittingComment}
                className="bg-[#1A1A1A] dark:bg-white text-white dark:text-[#1A1A1A] px-3 py-2 rounded-xl text-xs font-bold flex items-center gap-1"
              >
                <Send className="w-3.5 h-3.5" />
              </button>
            </form>

            <div className="space-y-2 max-h-48 overflow-y-auto pr-1">
              {comments.length === 0 ? (
                <p className="text-[11px] text-gray-400 italic">
                  No comments yet. Be the first to comment!
                </p>
              ) : (
                comments.map((c) => (
                  <div key={c.id} className="p-2.5 rounded-xl bg-[#F7F6F3] dark:bg-[#222222] text-xs">
                    <div className="flex items-center justify-between mb-1">
                      <span className="font-bold text-[#1A1A1A] dark:text-white">
                        {c.userDisplayName || "User"}
                      </span>
                    </div>
                    <p className="text-gray-700 dark:text-gray-300">{c.text}</p>
                  </div>
                ))
              )}
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </article>
  );
}

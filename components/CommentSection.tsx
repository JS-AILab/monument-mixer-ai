
import React, { useState } from 'react';
import type { Comment } from '../types';

const authors = ['PixelPioneer', 'ArtfulAl', 'CreativeCat', 'DesignDino', 'ImageInnovator'];
const sampleComments = [
    "Wow, that's an amazing concept! The lighting is perfect.",
    "This is so creative! How did you come up with this idea?",
    "I love the composition. The monument really stands out.",
    "Such a cool blend of styles. Great work!",
];

const getRandomItem = <T,>(arr: T[]): T => arr[Math.floor(Math.random() * arr.length)];

const CommentCard: React.FC<{ comment: Comment }> = ({ comment }) => (
    <div className="bg-slate-800 p-4 rounded-lg flex items-start gap-4">
        <div className="w-10 h-10 rounded-full bg-gradient-to-br from-cyan-500 to-indigo-600 flex-shrink-0 flex items-center justify-center font-bold text-white">
            {comment.author.charAt(0)}
        </div>
        <div>
            <div className="flex items-baseline gap-2">
                <p className="font-semibold text-cyan-400">{comment.author}</p>
                <p className="text-xs text-slate-500">{comment.timestamp}</p>
            </div>
            <p className="text-slate-300 mt-1">{comment.text}</p>
        </div>
    </div>
);


const CommentSection: React.FC = () => {
    const [comments, setComments] = useState<Comment[]>([
        { id: 1, author: getRandomItem(authors), text: getRandomItem(sampleComments), timestamp: '5 minutes ago' },
        { id: 2, author: getRandomItem(authors), text: getRandomItem(sampleComments), timestamp: '2 hours ago' },
    ]);
    const [newComment, setNewComment] = useState('');

    const handleSubmit = (e: React.FormEvent) => {
        e.preventDefault();
        if (newComment.trim()) {
            const comment: Comment = {
                id: Date.now(),
                author: 'You',
                text: newComment,
                timestamp: 'Just now',
            };
            setComments([comment, ...comments]);
            setNewComment('');
        }
    };

    return (
        <div className="w-full max-w-2xl mx-auto mt-8 space-y-6">
            <h3 className="text-xl font-semibold text-slate-200 border-b border-slate-700 pb-2">Feedback & Comments</h3>
            <form onSubmit={handleSubmit} className="flex gap-2">
                <input
                    type="text"
                    value={newComment}
                    onChange={(e) => setNewComment(e.target.value)}
                    placeholder="Share your thoughts..."
                    className="flex-grow bg-slate-800 border border-slate-700 rounded-md py-2 px-4 focus:ring-2 focus:ring-cyan-500 focus:outline-none transition"
                />
                <button type="submit" className="bg-cyan-500 hover:bg-cyan-600 text-white font-bold py-2 px-4 rounded-md transition-colors">
                    Comment
                </button>
            </form>
            <div className="space-y-4">
                {comments.map(comment => <CommentCard key={comment.id} comment={comment} />)}
            </div>
        </div>
    );
};

export default CommentSection;

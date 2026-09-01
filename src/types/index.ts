export interface User {
  id: string;
  username: string;
  email: string;
  avatar: string;
  bio: string;
  reputation: number;
  role: "ADMIN" | "MODERATOR" | "MEMBER" | "BANNED";
  status: "ACTIVE" | "SUSPENDED" | "BANNED" | "INACTIVE";
  title: string | null;
  github: string | null;
  website: string | null;
  location: string | null;
  postsCount: number;
  commentsCount: number;
  joinedAt: string;
  lastSeen: string | null;
}

export interface Category {
  id: string;
  name: string;
  slug: string;
  description: string | null;
  icon: string | null;
  color: string;
  order: number;
  isLocked: boolean;
  postsCount: number;
}

export interface Post {
  id: string;
  title: string;
  slug: string;
  content: string;
  authorId: string;
  author: User;
  categoryId: string;
  category: Category;
  tags: string[];
  views: number;
  upvotes: number;
  downvotes: number;
  isPinned: boolean;
  isLocked: boolean;
  isDeleted: boolean;
  editedAt: string | null;
  createdAt: string;
  updatedAt: string;
  commentCount?: number;
}

export interface Comment {
  id: string;
  content: string;
  authorId: string;
  author: User;
  postId: string;
  parentId: string | null;
  upvotes: number;
  downvotes: number;
  isDeleted: boolean;
  editedAt: string | null;
  createdAt: string;
  updatedAt: string;
  replies?: Comment[];
}

export interface ChatRoom {
  id: string;
  name: string;
  type: "PUBLIC" | "PRIVATE" | "DM" | "ANNOUNCEMENT";
  description: string | null;
  icon: string | null;
  memberCount: number;
}

export interface ChatMessage {
  id: string;
  content: string;
  userId: string;
  user: User;
  roomId: string;
  type: string;
  isDeleted: boolean;
  createdAt: string;
}

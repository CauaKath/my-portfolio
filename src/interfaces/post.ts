type PostStatus = 'DRAFT' | 'PUBLISHED'

interface IPost {
  id: string;
  slug: string;
  title: string;
  description: string | null;
  body: string;
  cover_url: string | null;
  tags: string[];
  status: PostStatus;
  published_at: string | null;
  created_at: string;
  updated_at: string;
}

interface IPostInput {
  slug: string;
  title: string;
  description: string | null;
  body: string;
  cover_url: string | null;
  tags: string[];
  status: PostStatus;
}

export type { PostStatus, IPost, IPostInput };

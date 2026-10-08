import type { ITag } from './tag'

type PostStatus = 'DRAFT' | 'PUBLISHED'

interface IPost {
  id: string;
  slug: string;
  title: string;
  description: string | null;
  body: string;
  cover_url: string | null;
  tags: ITag[];
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
  tag_ids: string[];
  status: PostStatus;
}

// What an insert or update returns: the columns of the posts table, without
// the tags, which live in post_tags and are not part of the row.
type IPostRow = Omit<IPost, 'tags'>;

export type { PostStatus, IPost, IPostInput, IPostRow };

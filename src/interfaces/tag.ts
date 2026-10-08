interface ITag {
  id: string;
  name: string;
  slug: string;
  description: string | null;
  color: string;
}

interface ITagInput {
  name: string;
  description: string | null;
  color: string;
}

interface ITagWithCount extends ITag {
  post_count: number;
}

export type { ITag, ITagInput, ITagWithCount };

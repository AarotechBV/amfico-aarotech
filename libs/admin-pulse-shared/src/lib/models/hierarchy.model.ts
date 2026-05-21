export type Hierarchy = {
  category: string;
  subCategories: {
    id: string;
    subCategory: string;
    children: { child: string; id: string }[];
  }[];
}[];

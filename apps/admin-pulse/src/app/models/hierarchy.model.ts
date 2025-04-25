export type Hierarchy = {
  category: string;
  subCategories: {
    subCategory: string;
    children: { child: string; code: string }[];
  }[];
}[];

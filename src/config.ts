export const SITE = {
  website: "https://everbox.io/", // replace this with your deployed domain
  author: "Jeff Yang",
  profile: "https://everbox.io/",
  desc: "A personal blog sharing my opinions and experiences in information technology, photography, motorcycle riding, and occasionally other passions like guitar and tennis.",
  title: "My Personal View to the World",
  ogImage: "astropaper-og.jpg",
  lightAndDarkMode: true,
  postPerIndex: 4,
  postPerPage: 4,
  scheduledPostMargin: 15 * 60 * 1000, // 15 minutes
  showArchives: true,
  showBackButton: true, // show back button in post detail
  editPost: {
    enabled: true,
    text: "Edit page",
    url: "https://github.com/j3ffyang/journal/",
  },
  dynamicOgImage: true,
  dir: "ltr", // "rtl" | "auto"
  lang: "en", // html lang code. Set this empty and default will be "en"
  timezone: "America/Toronto", // Default global timezone (IANA format) https://en.wikipedia.org/wiki/List_of_tz_database_time_zones
} as const;

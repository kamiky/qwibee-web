export interface Video {
  id: string;
  title: {
    en: string;
    fr: string;
  };
  description: {
    en: string;
    fr: string;
  };
  thumbnail?: string;
  duration?: string;
  price: number; // Price in cents (e.g., 999 = $9.99)
  paidFilename: string; // Paid content filename in /public/uploads/[profileId]/
  previewFilename: string; // Preview/blurred filename in /public/uploads/[profileId]/
}

export interface Profile {
  id: string;
  username: string;
  displayName: {
    en: string;
    fr: string;
  };
  bio: {
    en: string;
    fr: string;
  };
  avatar?: string;
  membershipPrice?: number; // Monthly membership price in cents
  videos: Video[];
}

export const profiles: Record<string, Profile> = {
  profile1: {
    id: "profile1",
    username: "profile1",
    displayName: {
      en: "Creator One",
      fr: "Créateur Un",
    },
    bio: {
      en: "Exclusive content creator sharing premium videos",
      fr: "Créateur de contenu exclusif partageant des vidéos premium",
    },
    avatar:
      "/uploads/profile1/paid_mp9nr2q3_5kyag60veyup4qdokuxoox9sol4hfl.jpg",
    membershipPrice: 999, // $9.99/month
    videos: [
      {
        id: "video1",
        title: {
          en: "Premium Content 1",
          fr: "Contenu Premium 1",
        },
        description: {
          en: "Exclusive video content available for members",
          fr: "Contenu vidéo exclusif disponible pour les membres",
        },
        duration: "2:30",
        price: 499, // $4.99 one-time
        paidFilename: "paid_hygahghv_kbr69oqxvnuzdiwkhpuibvch6vg6sp.mp4",
        previewFilename: "preview_hygahghv_irh5edyizwam8sznbiwovkild3f98h.mp4",
      },
      {
        id: "video2",
        title: {
          en: "Premium Content 2",
          fr: "Contenu Premium 2",
        },
        description: {
          en: "High-quality exclusive video for premium subscribers",
          fr: "Vidéo exclusive de haute qualité pour les abonnés premium",
        },
        duration: "3:15",
        price: 599, // $5.99 one-time
        paidFilename: "paid_izsymaig_3w5zqif2o4ne7opqd5fjnq9q9tqmxy.mp4",
        previewFilename: "preview_izsymaig_girt33gkvflzthjttggz217snl8ipf.mp4",
      },
      {
        id: "video3",
        title: {
          en: "Premium Content 3",
          fr: "Contenu Premium 3",
        },
        description: {
          en: "Behind-the-scenes exclusive footage",
          fr: "Images exclusives des coulisses",
        },
        duration: "4:20",
        price: 699, // $6.99 one-time
        paidFilename: "paid_jg2xfo13_q4rc0walixb505g9sqed64991jpnys.mp4",
        previewFilename: "preview_jg2xfo13_5le2oxxeael3cntsus0dzn0uk7ihwi.mp4",
      },
      {
        id: "video4",
        title: {
          en: "Premium Content 4",
          fr: "Contenu Premium 4",
        },
        description: {
          en: "Special edition content for dedicated fans",
          fr: "Contenu édition spéciale pour les fans dévoués",
        },
        duration: "5:00",
        price: 799, // $7.99 one-time
        paidFilename: "paid_zhz3rnmt_66t16c8sr2m0f0esmg5gqipdhi6nf9.mp4",
        previewFilename: "preview_zhz3rnmt_giplfonf2j5hjpz0q1o74w3m0d9dsr.mp4",
      },
    ],
  },
};

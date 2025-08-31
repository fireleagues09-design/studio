export type Tournament = {
  id: string;
  name: string;
  category: 'Classic Full Map' | 'Clash Squad 4v4';
  prize: string;
  entryFee: string;
  slots: number;
  slotsFilled: number;
  image: string;
  dataAiHint: string;
  date: string;
  time: string;
  rules: string[];
  prizeDistribution: { place: string; prize: string }[];
};

export const MOCK_BANNERS = [
    {
        title: "Championship Series",
        description: "The biggest tournament of the season is here. Register now!",
        image: "https://picsum.photos/1200/500",
        dataAiHint: "esports trophy"
    },
    {
        title: "Weekend Warriors Cup",
        description: "Special weekend event with a massive prize pool.",
        image: "https://picsum.photos/1200/501",
        dataAiHint: "gaming headset"
    },
    {
        title: "New Map Challenge",
        description: "Conquer the new map and claim your victory.",
        image: "https://picsum.photos/1200/502",
        dataAiHint: "neon lights"
    }
];

export const tournaments: Tournament[] = [
  {
    id: "t1",
    name: "Grandmaster League S1",
    category: "Classic Full Map",
    prize: "50,000",
    entryFee: "500",
    slots: 100,
    slotsFilled: 88,
    image: "https://picsum.photos/600/400",
    dataAiHint: "esports game",
    date: "2024-08-15",
    time: "18:00 IST",
    rules: ["All players must be level 40+", "No emulators allowed", "Only mobile devices", "Teams must check in 30 minutes before match time"],
    prizeDistribution: [
        { place: "1st", prize: "25,000" },
        { place: "2nd", prize: "15,000" },
        { place: "3rd", prize: "10,000" },
    ]
  },
  {
    id: "t2",
    name: "Clash Squad Kings",
    category: "Clash Squad 4v4",
    prize: "10,000",
    entryFee: "100",
    slots: 48,
    slotsFilled: 48,
    image: "https://picsum.photos/600/401",
    dataAiHint: "gaming controller",
    date: "2024-08-16",
    time: "20:00 IST",
    rules: ["4v4 format", "Best of 3 matches", "All standard CS rules apply"],
    prizeDistribution: [
        { place: "1st", prize: "5,000" },
        { place: "2nd", prize: "3,000" },
        { place: "3rd", prize: "2,000" },
    ]
  },
  {
    id: "t3",
    name: "Rookie Rumble",
    category: "Classic Full Map",
    prize: "5,000",
    entryFee: "FREE",
    slots: 100,
    slotsFilled: 50,
    image: "https://picsum.photos/600/402",
    dataAiHint: "abstract shapes",
    date: "2024-08-18",
    time: "16:00 IST",
    rules: ["For players below level 30", "Great opportunity to learn and win", "No emulators"],
    prizeDistribution: [
        { place: "1st", prize: "2,500" },
        { place: "2nd", prize: "1,500" },
        { place: "3rd", prize: "1,000" },
    ]
  },
  {
    id: "t4",
    name: "4v4 Fury",
    category: "Clash Squad 4v4",
    prize: "20,000",
    entryFee: "250",
    slots: 64,
    slotsFilled: 32,
    image: "https://picsum.photos/600/403",
    dataAiHint: "neon lines",
    date: "2024-08-20",
    time: "19:00 IST",
    rules: ["Single elimination bracket", "All guns allowed", "Fair play is mandatory"],
    prizeDistribution: [
        { place: "1st", prize: "10,000" },
        { place: "2nd", prize: "6,000" },
        { place: "3rd-4th", prize: "2,000" },
    ]
  },
  {
    id: "t5",
    name: "Solo Survival Challenge",
    category: "Classic Full Map",
    prize: "15,000",
    entryFee: "150",
    slots: 100,
    slotsFilled: 95,
    image: "https://picsum.photos/600/404",
    dataAiHint: "lone wolf",
    date: "2024-08-22",
    time: "17:00 IST",
    rules: ["Solo mode", "Points based on kills and survival time", "Top 10 players win prizes"],
    prizeDistribution: [
        { place: "1st", prize: "7,000" },
        { place: "2nd", prize: "4,000" },
        { place: "3rd", prize: "2,000" },
        { place: "4th-10th", prize: "285 each"},
    ]
  },
   {
    id: "t6",
    name: "Squad Goals Weekly",
    category: "Clash Squad 4v4",
    prize: "8,000",
    entryFee: "80",
    slots: 32,
    slotsFilled: 16,
    image: "https://picsum.photos/600/405",
    dataAiHint: "team huddle",
    date: "2024-08-25",
    time: "21:00 IST",
    rules: ["Weekly event", "Winners get direct entry to monthly finals", "Standard competitive ruleset"],
    prizeDistribution: [
        { place: "1st", prize: "4,000" },
        { place: "2nd", prize: "2,500" },
        { place: "3rd", prize: "1,500" },
    ]
  },
];


export const MOCK_USERS = [
    { id: 'user-001', name: 'PlayerOne', email: 'playerone@example.com', phone: '1234567890', registeredOn: '2024-01-15' },
    { id: 'user-002', name: 'ProGamer', email: 'progamer@example.com', phone: '0987654321', registeredOn: '2024-02-20' },
    { id: 'user-003', name: 'NoobMaster69', email: 'noobmaster@example.com', phone: '1122334455', registeredOn: '2024-03-10' },
    { id: 'user-004', name: 'ShadowStriker', email: 'shadow@example.com', phone: '5566778899', registeredOn: '2024-04-05' },
    { id: 'user-005', name: 'PhoenixFire', email: 'phoenix@example.com', phone: '9988776655', registeredOn: '2024-05-25' },
    { id: 'user-006', name: 'ViperX', email: 'viper@example.com', phone: '3344556677', registeredOn: '2024-06-18' },
];

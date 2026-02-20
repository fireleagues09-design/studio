
export type Tournament = {
  id: string;
  name: string;
  category: 'Classic Full Map' | 'Clash Squad 4v4';
  teamType: 'Solo' | 'Duo' | 'Squad';
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
  status: 'Upcoming' | 'Ongoing' | 'Finished';
  roomId?: string;
  roomPassword?: string;
  registeredPlayers?: string[];
};

export const FULL_MAP_RULES = [
    'You Will Get Room ID & Password 10 to 5 minutes before the match starting time.',
    'Always On Screen Recording While Playing FireLeagues Tournament matches ( for your own goods and in any major issues screenshot will not accepted ).',
    'Minimum Game Level Should be 40.',
    'Headshot ( % ) Should not be more then 70% in BR Career mode.',
    'Don\'t Invite Anyone who is not registered to this tournament and don\'t leak ID Password.',
    'Team-up not allowed.',
    'Multiple Accounts Are not Allowed and if you create multiple Accounts then it\'ll lead to suspension and all balance will be taken by us permanently.',
    'Refund Only For those players who\'s eliminated/killed by hackers',
    'PC & Emulators Players Are Not Allowed to join and play in room match ( only can access website on pc and can only register yourself for tournaments in PC/Emulators/mobile but not allowed to play tournaments )'
];

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
    teamType: "Squad",
    prize: "50,000",
    entryFee: "500",
    slots: 100,
    slotsFilled: 88,
    image: "https://picsum.photos/600/400",
    dataAiHint: "esports game",
    date: "2024-08-15",
    time: "18:00 IST",
    rules: FULL_MAP_RULES,
    prizeDistribution: [
        { place: "1st", prize: "25,000" },
        { place: "2nd", prize: "15,000" },
        { place: "3rd", prize: "10,000" },
    ],
    status: 'Upcoming'
  },
  {
    id: "t2",
    name: "Clash Squad Kings",
    category: "Clash Squad 4v4",
    teamType: "Squad",
    prize: "10,000",
    entryFee: "100",
    slots: 48,
    slotsFilled: 48,
    image: "https://picsum.photos/600/401",
    dataAiHint: "gaming controller",
    date: "2024-08-16",
    time: "20:00 IST",
    rules: FULL_MAP_RULES,
    prizeDistribution: [
        { place: "1st", prize: "5,000" },
        { place: "2nd", prize: "3,000" },
        { place: "3rd", prize: "2,000" },
    ],
    status: 'Finished'
  },
  {
    id: "t3",
    name: "Rookie Rumble",
    category: "Classic Full Map",
    teamType: "Solo",
    prize: "5,000",
    entryFee: "FREE",
    slots: 100,
    slotsFilled: 50,
    image: "https://picsum.photos/600/402",
    dataAiHint: "abstract shapes",
    date: "2024-08-18",
    time: "16:00 IST",
    rules: FULL_MAP_RULES,
    prizeDistribution: [
        { place: "1st", prize: "2,500" },
        { place: "2,500", prize: "1,500" },
        { place: "3rd", prize: "1,000" },
    ],
    status: 'Upcoming'
  },
  {
    id: "t4",
    name: "4v4 Fury",
    category: "Clash Squad 4v4",
    teamType: "Squad",
    prize: "20,000",
    entryFee: "250",
    slots: 64,
    slotsFilled: 32,
    image: "https://picsum.photos/600/403",
    dataAiHint: "neon lines",
    date: "2024-08-20",
    time: "19:00 IST",
    rules: FULL_MAP_RULES,
    prizeDistribution: [
        { place: "1st", prize: "10,000" },
        { place: "2nd", prize: "6,000" },
        { place: "3rd-4th", prize: "2,000" },
    ],
    status: 'Ongoing'
  },
  {
    id: "t5",
    name: "Solo Survival Challenge",
    category: "Classic Full Map",
    teamType: "Solo",
    prize: "15,000",
    entryFee: "150",
    slots: 100,
    slotsFilled: 95,
    image: "https://picsum.photos/600/404",
    dataAiHint: "lone wolf",
    date: "2024-08-22",
    time: "17:00 IST",
    rules: FULL_MAP_RULES,
    prizeDistribution: [
        { place: "1st", prize: "7,000" },
        { place: "2nd", prize: "4,000" },
        { place: "3rd", prize: "2,000" },
        { place: "4th-10th", prize: "285 each"},
    ],
    status: 'Upcoming'
  },
   {
    id: "t6",
    name: "Squad Goals Weekly",
    category: "Clash Squad 4v4",
    teamType: "Squad",
    prize: "8,000",
    entryFee: "80",
    slots: 32,
    slotsFilled: 16,
    image: "https://picsum.photos/600/405",
    dataAiHint: "team huddle",
    date: "2024-08-25",
    time: "21:00 IST",
    rules: FULL_MAP_RULES,
    prizeDistribution: [
        { place: "1st", prize: "4,000" },
        { place: "2nd", prize: "2,500" },
        { place: "3rd", prize: "1,500" },
    ],
    status: 'Upcoming'
  },
];


export type User = {
    id: string;
    inGameName: string;
    email: string;
    phone: string;
    registeredOn: {
        seconds: number;
        nanoseconds: number;
    } | Date;
    wallet: {
        deposit: number;
        winning: number;
        bonus: number;
    };
    duoTeam?: Team;
    squadTeam?: Team;
};

export type TeamMember = {
    inGameName: string;
    inGameUid: string;
};

export type Team = {
    name?: string;
    type: 'Duo' | 'Squad';
    members: TeamMember[];
};

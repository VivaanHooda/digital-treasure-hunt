// Complete challenge data for your treasure hunt - Set A with user-specific randomization

const ORIGINAL_CHALLENGES_SET_A = [
  {
    id: 0,
    type: 'picture',
    title: 'Where Could This Be?',
    description: '',
    imageUrl: '/images/challenges/MathematicsDepartment_.jpg',
    targetLocation: {
      latitude: 12.924031356648811,
      longitude: 77.50118731104367,
      name: 'Maths Department'
    },
    marginOfError: 20,
    points: 10
  },
  {
    id: 1,
    type: 'riddle',
    title: 'Decode the Scene',
    description: 'Wide steps stretch like open arms, Two red towers guard with charm. In this courtyard, grand and high, Your next clue waits—go, don\'t shy!',
    targetLocation: {
      latitude: 12.923653671176949,
      longitude: 77.50136112453583,
      name: 'RVU Stairs'
    },
    marginOfError: 20,
    points: 20
  },
  {
    id: 2,
    type: 'picture',
    title: 'Where Could This Be?',
    description: '',
    imageUrl: '/images/challenges/ISE Tree.jpg',
    targetLocation: {
      latitude: 12.923640357042123,
      longitude: 77.50095672453588,
      name: 'ISE Tree'
    },
    marginOfError: 20,
    points: 10
  },
  {
    id: 3,
    type: 'riddle',
    title: 'Decode the Scene',
    description: 'Under a roof of metal shade, Red tiles mark the path once laid. With garlands above and lamps that glow, Seek the shrine where blessings flow.',
    targetLocation: {
      latitude: 12.924823113712105,
      longitude: 77.50092295152024,
      name: 'Temple'
    },
    marginOfError: 20,
    points: 20
  },
  {
    id: 4,
    type: 'picture',
    title: 'Look Closely, Seek Wisely ',
    description: '',
    imageUrl: '/images/challenges/CCAV.jpg',
    targetLocation: {
      latitude: 12.924696970039946,
      longitude: 77.49984123802811,
      name: 'Centre of Connected Autonomous Vehicles'
    },
    marginOfError: 20,
    points: 10
  },
  {
    id: 5,
    type: 'riddle',
    title: 'Decode the Scene',
    description: 'Where boots mark earth and nets breathe slow, Where shouts and whistles come and go. Find the field where games begin—Your next clue waits where goals stand in.',
    targetLocation: {
      latitude: 12.924823898827015,
      longitude: 77.50002602453591,
      name: 'Main Ground'
    },
    marginOfError: 20,
    points: 20
  },
  {
    id: 6,
    type: 'picture',
    title: 'Your Next Destination Awaits',
    description: '',
    imageUrl: '/images/challenges/Kotak Bank_.jpg',
    targetLocation: {
      latitude: 12.92509375557992,
      longitude: 77.49938825337182,
      name: 'Kotak Bank'
    },
    marginOfError: 20,
    points: 10
  },
  {
    id: 7,
    type: 'riddle',
    title: 'Decode the Scene',
    description: 'I\'m a bird of iron, frozen mid-flight, A story of journeys locked in plain sight. I never take off, though my nose points high, Forever I\'m waiting to conquer the sky. What am I?',
    targetLocation: {
      latitude: 12.924519656157495,
      longitude: 77.49914236686402,
      name: 'Airplane'
    },
    marginOfError: 20,
    points: 20
  },
  {
    id: 8,
    type: 'picture',
    title: 'Where Could This Be?',
    description: '',
    imageUrl: '/images/challenges/Kriyapalpa_.jpg',
    targetLocation: {
      latitude: 12.924174456504822,
      longitude: 77.49956678220778,
      name: 'Kriyakalpa'
    },
    marginOfError: 20,
    points: 10
  },
  {
    id: 9,
    type: 'riddle',
    title: 'Decode the Scene',
    description: 'When the bell rings, I turn into a hive. Hungry bees line up, buzzing for bread, puffs, and chai. Though tiny, I sweeten the longest days. Who am I?',
    targetLocation: {
      latitude: 12.923630186327935,
      longitude: 77.49985499569993,
      name: 'MM Foods'
    },
    marginOfError: 20,
    points: 20
  },
  {
    id: 10,
    type: 'picture',
    title: 'Match the Picture to the Place',
    description: '',
    imageUrl: '/images/challenges/Place between Chemical, Library and ETE.jpg',
    targetLocation: {
      latitude: 12.923069043926802,
      longitude: 77.50048203804349,
      name: 'Library Intersection Area'
    },
    marginOfError: 20,
    points: 10
  },
  {
    id: 11,
    type: 'riddle',
    title: 'Decode the Scene',
    description: 'RI CPF TGUGCTEJ DNQEM - OG FGRCTVOGPV (Hint: Caesar cipher - shift each letter 2 positions forward in the alphabet)',
    targetLocation: {
      latitude: 12.923619343658839,
      longitude: 77.4983475245509,
      name: 'Mechanical PG Block'
    },
    marginOfError: 20,
    points: 20
  },
  {
    id: 12,
    type: 'picture',
    title: 'Where Could This Be?',
    description: '',
    imageUrl: '/images/challenges/CSE Department_.jpg',
    targetLocation: {
      latitude: 12.924452156954706,
      longitude: 77.50010366686402,
      name: 'Computer Science Department'
    },
    marginOfError: 20,
    points: 10
  },
  {
    id: 13,
    type: 'riddle',
    title: 'Decode the Scene',
    description: '27872 76268427 (Hint: Map letters using a classic phone keypad - 2=ABC, 3=DEF, 4=GHI, 5=JKL, 6=MNO, 7=PQRS, 8=TUV, 9=WXYZ)',
    targetLocation: {
      latitude: 12.923132444178584,
      longitude: 77.49787596688786,
      name: 'Astra Robotics'
    },
    marginOfError: 20,
    points: 20
  },
  {
    id: 14,
    type: 'picture',
    title: 'Your Next Destination Awaits',
    description: '',
    imageUrl: '/images/challenges/Civil department_.jpg',
    targetLocation: {
      latitude: 12.924506428022577,
      longitude: 77.49946733802808,
      name: 'Civil Engineering Department'
    },
    marginOfError: 20,
    points: 10
  },
  {
    id: 15,
    type: 'riddle',
    title: 'Decode the Scene',
    description: 'I\'m three of a kind, each one the same. I spark your path with light and flame. Find the hall where circuits meet—Three letters repeat.',
    targetLocation: {
      latitude: 12.92433519616346,
      longitude: 77.50009680113578,
      name: 'EEE Department'
    },
    marginOfError: 20,
    points: 20
  },
  {
    id: 16,
    type: 'picture',
    title: 'Your Next Destination Awaits',
    description: '',
    imageUrl: '/images/challenges/Chemical_.jpg',
    targetLocation: {
      latitude: 12.92366235702001,
      longitude: 77.49999070919209,
      name: 'Chemical Department'
    },
    marginOfError: 20,
    points: 10
  },
  {
    id: 17,
    type: 'riddle',
    title: 'Decode the Scene',
    description: 'Without me, phones would fall silent, Radios and satellites defiant. I\'m the bridge that lets signals flow, Where you must now choose to go.',
    targetLocation: {
      latitude: 12.923722761200711,
      longitude: 77.50014816774578,
      name: 'ETE Department'
    },
    marginOfError: 20,
    points: 20
  },
  {
    id: 18,
    type: 'picture',
    title: 'Where Could This Be?',
    description: '',
    imageUrl: '/images/challenges/Health Centre.jpg',
    targetLocation: {
      latitude: 12.924459604639114,
      longitude: 77.50068331671172,
      name: 'Health Centre'
    },
    marginOfError: 20,
    points: 10
  },
  {
    id: 19,
    type: 'riddle',
    title: 'Decode the Scene',
    description: 'ZFWRGLIRFN (Hint: Replace each letter with its opposite in the alphabet A↔Z, B↔Y, C↔X...)',
    targetLocation: {
      latitude: 12.923100148722689,
      longitude: 77.4985066217639,
      name: 'IEM Auditorium'
    },
    marginOfError: 20,
    points: 20
  },
  {
    id: 20,
    type: 'picture',
    title: 'Your Next Destination Awaits',
    description: '',
    imageUrl: '/images/challenges/Computer Science laboratory complex_.jpg',
    targetLocation: {
      latitude: 12.924541086778179,
      longitude: 77.49921151352048,
      name: 'Computer Science Laboratory Complex'
    },
    marginOfError: 20,
    points: 10
  },
  {
    id: 21,
    type: 'riddle',
    title: 'Decode the Scene',
    description: 'Buttons hum and lights glow bright, Coins go in and treats come out at night. Press a number, wait a beat—Find your snack where metal and hunger meet.',
    targetLocation: {
      latitude: 12.923743399868828,
      longitude: 77.500619438028,
      name: 'Vending Machine Area'
    },
    marginOfError: 20,
    points: 20
  },
  {
    id: 22,
    type: 'picture',
    title: 'Find the Spot',
    description: '',
    imageUrl: '/images/challenges/ECE.jpg',
    targetLocation: {
      latitude: 12.923947975061562,
      longitude: 77.49992614115814,
      name: 'ECE Department'
    },
    marginOfError: 20,
    points: 10
  },
  {
    id: 23,
    type: 'riddle',
    title: 'Decode the Scene',
    description: '11-18-9-19-8-14-1 8-15-19-20-5-12 (Hint: Number substitution A=1, B=2, C=3... Z=26)',
    targetLocation: {
      latitude: 12.924123157189314,
      longitude: 77.50044850919215,
      name: 'Krishna Hostel'
    },
    marginOfError: 20,
    points: 20
  },
  {
    id: 24,
    type: 'picture',
    title: 'Where Could This Be?',
    description: '',
    imageUrl: '/images/challenges/Garuda.jpg',
    targetLocation: {
      latitude: 12.923390643124943,
      longitude: 77.49790165152028,
      name: 'Garuda'
    },
    marginOfError: 20,
    points: 10
  },
  {
    id: 25,
    type: 'riddle',
    title: 'Decode the Scene',
    description: 'I am a shelter of minds that race, Where wheels, wings, and stars find their place. From the spark of light to the roar of speed, I\'m the ground where new ideas breed. What am I?',
    targetLocation: {
      latitude: 12.923686156996041,
      longitude: 77.4979171957,
      name: 'Innovative Hub'
    },
    marginOfError: 20,
    points: 20
  },
  {
    id: 26,
    type: 'picture',
    title: 'Match the Picture to the Place',
    description: '',
    imageUrl: '/images/challenges/RVU Library.jpg',
    targetLocation: {
      latitude: 12.922607163215126,
      longitude: 77.49998488720018,
      name: 'RVU Library (Mingos Side)'
    },
    marginOfError: 20,
    points: 10
  },
  {
    id: 27,
    type: 'riddle',
    title: 'Decode the Scene',
    description: 'Though no teacher stands to speak, I\'m a place where new life you can seek. Behind my fence of gilded hue, I hold the green, the fresh, the new. Where seedlings rise and lessons start, you will find the garden\'s heart.',
    targetLocation: {
      latitude: 12.922791687506452,
      longitude: 77.49953175383511,
      name: 'Nursery'
    },
    marginOfError: 20,
    points: 20
  },
  {
    id: 28,
    type: 'picture',
    title: 'Find the Spot',
    description: '',
    imageUrl: '/images/challenges/Central Computing Hub (CCH).jpg',
    targetLocation: {
      latitude: 12.922804839034336,
      longitude: 77.49937318742167,
      name: 'Central Computing Hub (CCH)'
    },
    marginOfError: 20,
    points: 10
  },
  {
    id: 29,
    type: 'riddle',
    title: 'Decode the Scene',
    description: 'I hide between two worlds of code, Where algorithms and apps are sowed. Palm trees guard my quiet ground, Yet few may know where I am found. Not a hall, but open sky, A secret garden where minds pass by.',
    targetLocation: {
      latitude: 12.92256672964908,
      longitude: 77.49867562453585,
      name: 'Biotech and MCA Garden'
    },
    marginOfError: 20,
    points: 20
  },
  {
    id: 30,
    type: 'picture',
    title: 'Match the Picture to the Place',
    description: '',
    imageUrl: '/images/challenges/bio_quad.jpeg',
    targetLocation: {
      latitude: 12.922719906173793,
      longitude: 77.49864111902738,
      name: 'Biotech Quadrangle'
    },
    marginOfError: 20,
    points: 10
  },
  {
    id: 31,
    type: 'riddle',
    title: 'Decode the Scene',
    description: 'I stand with pillars, shaded and tall, Guarding the memory that started it all. Steps lead up where silence stays, Honoring vision in timeless ways. Not a classroom, yet wisdom I hold—Find the heart where stories are told.',
    targetLocation: {
      latitude: 12.922737429505942,
      longitude: 77.4982588091921,
      name: 'Founders Memorial'
    },
    marginOfError: 20,
    points: 20
  },
  {
    id: 32,
    type: 'picture',
    title: 'Match the Picture to the Place',
    description: '',
    imageUrl: '/images/challenges/rvce_lib_outside.jpeg',
    targetLocation: {
      latitude: 12.92303287185346,
      longitude: 77.50059822453589,
      name: 'RVCE Library Outside Area'
    },
    marginOfError: 20,
    points: 10
  },
  {
    id: 33,
    type: 'riddle',
    title: 'Decode the Scene',
    description: 'I stand beneath the open sky, where branches wave as people walk by. My tables fill with plates of food, and stories shared in a lively mood. Step through my door and you will see, a bustling heart of hospitality.',
    targetLocation: {
      latitude: 12.922534315436693,
      longitude: 77.49976012270945,
      name: 'Mingos Outside Area'
    },
    marginOfError: 20,
    points: 20
  },
  {
    id: 34,
    type: 'picture',
    title: 'Where Could This Be?',
    description: '',
    imageUrl: '/images/challenges/RVCE x Toyota_.jpg',
    targetLocation: {
      latitude: 12.923207786576,
      longitude: 77.49789742453584,
      name: 'RV—Toyota Centre of Excellence'
    },
    marginOfError: 20,
    points: 10
  },
  {
    id: 35,
    type: 'riddle',
    title: 'Decode the Scene',
    description: 'I am the place where wheels are many, Engines roar though the halls seem empty. Two names I hold, one of horse and one of sun, Together they build machines that run. Where are you?',
    targetLocation: {
      latitude: 12.923286686132819,
      longitude: 77.49792961104366,
      name: 'Ashwa Racing & Helios Racing Garage'
    },
    marginOfError: 20,
    points: 20
  },
  {
    id: 36,
    type: 'picture',
    title: 'Look Closely, Seek Wisely',
    description: '',
    imageUrl: '/images/challenges/Cauvery Hostel.jpg',
    targetLocation: {
      latitude: 12.923967585533395,
      longitude: 77.50093512268437,
      name: 'Cauvery Hostel'
    },
    marginOfError: 20,
    points: 10
  },
  {
    id: 37,
    type: 'riddle',
    title: 'Decode the Scene',
    description: 'I stand between books and beakers, a place where knowledge meets matter. I\'m a grassy triangle, a silent meeting point for scholars on their way to decode the world\'s secrets.',
    targetLocation: {
      latitude: 12.923291443216385,
      longitude: 77.4978545091921,
      name: 'Library Intersection Area'
    },
    marginOfError: 20,
    points: 20
  }
];

// Simple seeded random number generator (LCG algorithm)
function createSeededRandom(seed) {
  let state = seed;
  return function() {
    state = (state * 1664525 + 1013904223) % Math.pow(2, 32);
    return state / Math.pow(2, 32);
  };
}

// Convert string to numeric seed
function stringToSeed(str) {
  let hash = 0;
  for (let i = 0; i < str.length; i++) {
    const char = str.charCodeAt(i);
    hash = ((hash << 5) - hash) + char;
    hash = hash & hash; // Convert to 32-bit integer
  }
  return Math.abs(hash);
}

// Fisher-Yates shuffle with seeded random
function shuffleArray(array, seed) {
  const shuffled = [...array];
  const random = createSeededRandom(seed);
  
  for (let i = shuffled.length - 1; i > 0; i--) {
    const j = Math.floor(random() * (i + 1));
    [shuffled[i], shuffled[j]] = [shuffled[j], shuffled[i]];
  }
  
  return shuffled;
}

// Cache for shuffled challenges per user
const userChallengesCache = new Map();

// Get challenges shuffled for specific user
export function getChallengesForUser(userId) {
  if (!userId) {
    console.warn('No userId provided, returning original order');
    return ORIGINAL_CHALLENGES_SET_A;
  }

  // Check cache first
  if (userChallengesCache.has(userId)) {
    return userChallengesCache.get(userId);
  }

  // Generate seed from userId
  const seed = stringToSeed(userId);
  
  // Shuffle challenges
  const shuffled = shuffleArray(ORIGINAL_CHALLENGES_SET_A, seed);
  
  // Reassign IDs to match array indices (0-39)
  const reindexed = shuffled.map((challenge, index) => ({
    ...challenge,
    id: index,
    originalId: challenge.id // Keep track of original ID if needed
  }));

  // Cache the result
  userChallengesCache.set(userId, reindexed);
  
  return reindexed;
}

// Maintain backward compatibility
export const CHALLENGES_SET_A = ORIGINAL_CHALLENGES_SET_A;

// Updated helper function to work with user-specific challenges
export const getChallengeById = (id, userId = null) => {
  if (userId) {
    const userChallenges = getChallengesForUser(userId);
    return userChallenges.find(challenge => challenge.id === id);
  }
  
  // Fallback to original array if no userId provided
  return ORIGINAL_CHALLENGES_SET_A.find(challenge => challenge.id === id);
};
import type { ToyDef, AbilityDef, AbilityId } from '../types';

const list: ToyDef[] = [
  // WARM
  { id: 'bigTed', name: 'Big Ted', type: 'warm', base: { spirit: 140, flair: 55, poise: 62, hustle: 30 }, ability: 'unretired', moves: ['cocoaPour', 'fluffUp', 'hibernate', 'bigHug'], bio: 'Retired from boxing. Unretired for boxing.', taunt: 'Big Ted cracks his neck. It squeaks.' },
  { id: 'gingerSnap', name: 'Ginger Snap', type: 'warm', base: { spirit: 95, flair: 66, poise: 45, hustle: 78 }, ability: 'cantCatchMe', moves: ['hotBatch', 'runRunRun', 'crumbTrail', 'icingOnTop'], bio: 'Fast. Knows it. Mentions it.', taunt: 'Ginger Snap is already stretching. Loudly.' },
  { id: 'chuggs', name: 'Chuggs', type: 'warm', base: { spirit: 120, flair: 68, poise: 55, hustle: 45 }, ability: 'coalFired', moves: ['fullSteam', 'whistleStop', 'coalShovel', 'lastStop'], bio: 'Runs on coal. Has made peace with that.', taunt: 'Chuggs idles. Ominously.' },
  // PINE
  { id: 'colonelCrunch', name: 'Colonel Crunch', type: 'pine', base: { spirit: 115, flair: 62, poise: 72, hustle: 40 }, ability: 'perfectionist', moves: ['nutcrackerSuite', 'atAttention', 'nitpick', 'salute21'], bio: 'Has cracked 4,000 walnuts. Will tell you about each.', taunt: 'Colonel Crunch is inspecting your seams.' },
  { id: 'dobbin', name: 'Dobbin', type: 'pine', base: { spirit: 130, flair: 56, poise: 60, hustle: 44 }, ability: 'steady', moves: ['backAndForth', 'giddyUp', 'longFace', 'fullGallop'], bio: 'Goes nowhere. Takes his time getting there.', taunt: 'Dobbin rocks. Gently. Menacingly.' },
  { id: 'jack', name: 'Jack', type: 'pine', base: { spirit: 88, flair: 80, poise: 40, hustle: 64 }, ability: 'surprise', moves: ['popGoes', 'woundUp', 'jumpScare', 'jackpot'], bio: 'Wound up since 1987.', taunt: 'Something in the box is humming.' },
  // SPARK
  { id: 'sprocket', name: 'Sprocket', type: 'spark', base: { spirit: 110, flair: 62, poise: 60, hustle: 55 }, ability: 'optimized', moves: ['circleBack', 'synergize', 'downsize', 'mandatoryFun'], bio: "Let's circle back on that.", taunt: 'Sprocket has scheduled this showdown.' },
  { id: 'cymon', name: 'Cymon', type: 'spark', base: { spirit: 105, flair: 68, poise: 46, hustle: 60 }, ability: 'racket', moves: ['crash', 'encore', 'wakeNeighbors', 'cymbalSolo'], bio: "Knows one song. It's this one.", taunt: 'Cymon has been clanging for six hours.' },
  { id: 'chatterbox', name: 'Chatterbox', type: 'spark', base: { spirit: 92, flair: 64, poise: 50, hustle: 70 }, ability: 'noFilter', moves: ['chatter', 'trashTalk', 'gnash', 'sayCheese'], bio: 'No body. No filter.', taunt: 'Chatterbox has opinions about you already.' },
  // FROST
  { id: 'dameFlurry', name: 'Dame Flurry', type: 'frost', base: { spirit: 100, flair: 74, poise: 46, hustle: 50 }, ability: 'shakeMeUp', moves: ['shakeItUp', 'whiteout', 'glassAct', 'blizzardBallad'], bio: 'Has been shaken. Will not be stirred.', taunt: 'Dame Flurry requests a key light.' },
  { id: 'slick', name: 'Slick', type: 'frost', base: { spirit: 95, flair: 60, poise: 50, hustle: 84 }, ability: 'slippery', moves: ['tripleAxel', 'coldShoulder', 'bellySlide', 'blackIce'], bio: 'Fastest thing on ice. Only thing on ice.', taunt: 'Slick does a lap. Unprompted.' },
  { id: 'abner', name: 'Abner', type: 'frost', base: { spirit: 150, flair: 50, poise: 60, hustle: 34 }, ability: 'bigSoftie', moves: ['snowAngel', 'bigShrug', 'snowdrift', 'avalanche'], bio: 'Big. Soft. Slightly damp.', taunt: 'Abner is sitting on the path. He seems fine with it.' },
  // BOSS
  { id: 'topper', name: 'The Topper', type: 'spark', base: { spirit: 150, flair: 72, poise: 64, hustle: 58 }, ability: 'topBilling', moves: ['twinkle', 'warmGlow', 'snowShine', 'spotlight'], bio: 'Will not come down. Frankly, a star.', taunt: 'The Topper will see you now.', boss: true },
];

export const TOYS: Readonly<Record<string, ToyDef>> = Object.fromEntries(list.map((t) => [t.id, t]));
export const TOY_LIST: readonly ToyDef[] = list;
export const ROSTER: readonly ToyDef[] = list.filter((t) => !t.boss);

export function toy(id: string): ToyDef {
  const t = TOYS[id];
  if (!t) throw new Error(`Unknown toy: ${id}`);
  return t;
}

export const ABILITIES: Readonly<Record<AbilityId, AbilityDef>> = {
  unretired: { id: 'unretired', name: 'Unretired', text: 'The first time he would be Humbugged, he hangs on with 1 Spirit.', oneShot: true },
  cantCatchMe: { id: 'cantCatchMe', name: "Can't Catch Me", text: 'Dodges the first SHOW move aimed at him.', oneShot: true },
  coalFired: { id: 'coalFired', name: 'Coal-Fired', text: 'Coal heals him instead of hurting.' },
  perfectionist: { id: 'perfectionist', name: 'Perfectionist', text: 'PERFECT performances land ×1.5 instead of ×1.3.' },
  steady: { id: 'steady', name: 'Steady', text: 'Keep Cool is never worse than STEADY.' },
  surprise: { id: 'surprise', name: 'Surprise!', text: 'His first SHOW move hits ×1.5.', oneShot: true },
  optimized: { id: 'optimized', name: 'Optimized', text: 'Repeating a SHOW move: +15% per repeat (max +45%).' },
  racket: { id: 'racket', name: 'Racket', text: "The opponent's minigames run 20% faster." },
  noFilter: { id: 'noFilter', name: 'No Filter', text: 'Naughty moves fill his list half as fast.' },
  shakeMeUp: { id: 'shakeMeUp', name: 'Shake Me Up', text: '+1 FLAIR every time she gets rattled.' },
  slippery: { id: 'slippery', name: 'Slippery', text: "Can't be Tangled or slowed down." },
  bigSoftie: { id: 'bigSoftie', name: 'Big Softie', text: 'Recovers 6% Spirit at the end of each turn.' },
  topBilling: { id: 'topBilling', name: 'Top Billing', text: 'Has no weaknesses. Ask her.' },
};

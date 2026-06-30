import { GifEntry } from '../types';

export const GIF_LIBRARY: GifEntry[] = [
  // 😂 Funny
  { id: 'funny-laugh', name: 'Laughing Out Loud', categories: ['funny', 'trending'], tags: ['laugh', 'funny', 'lol', 'haha', 'laughing', 'joy', '😂'], emoji: '😂', path: '/gifs/funny-laugh.gif' },
  { id: 'funny-lmao', name: 'Rolling Laugh', categories: ['funny', 'memes'], tags: ['lmao', 'rofl', 'funny', 'laughing', 'crying laugh', '🤣'], emoji: '🤣', path: '/gifs/funny-lmao.gif' },
  { id: 'funny-laugh-cry', name: 'Laugh Cry', categories: ['funny'], tags: ['laugh', 'cry', 'tears', 'joy', 'lol', '😂', '😭'], emoji: '😭', path: '/gifs/funny-laugh-cry.gif' },
  { id: 'funny-sarcastic', name: 'Sarcastic Laugh', categories: ['funny', 'reactions'], tags: ['sarcasm', 'fake laugh', 'funny', 'mocking', '🎭'], emoji: '🎭', path: '/gifs/funny-sarcastic.gif' },
  { id: 'funny-giggle', name: 'Meme Giggle', categories: ['funny', 'memes'], tags: ['giggle', 'cute', 'funny', 'chuckle', '😅'], emoji: '😅', path: '/gifs/funny-giggle.gif' },

  // ❤️ Love / Cute
  { id: 'love-heart', name: 'Love Heart', categories: ['love', 'trending'], tags: ['heart', 'love', 'kiss', 'romance', 'sweet', '❤️'], emoji: '❤️', path: '/gifs/love-heart.gif' },
  { id: 'love-cute', name: 'Cute Love', categories: ['love', 'animals'], tags: ['cute', 'love', 'baby', 'adorable', 'puppy', '😍'], emoji: '😍', path: '/gifs/love-cute.gif' },
  { id: 'love-please', name: 'Please Baby', categories: ['love', 'reactions'], tags: ['please', 'begging', 'cute', 'innocent', '🥺'], emoji: '🥺', path: '/gifs/love-please.gif' },
  { id: 'love-hug', name: 'Warm Hug', categories: ['love'], tags: ['hug', 'cuddle', 'support', 'friendship', '🤍'], emoji: '🤍', path: '/gifs/love-hug.gif' },
  { id: 'love-wink', name: 'Innocent Wink', categories: ['love', 'reactions'], tags: ['wink', 'flirt', 'innocent', 'cute', '😇'], emoji: '😇', path: '/gifs/love-wink.gif' },

  // 😭 Reactions (Crying / Emotional / Nervous)
  { id: 'react-cry', name: 'Crying Tears', categories: ['reactions'], tags: ['cry', 'sad', 'tears', 'crying', 'depressed', '😭'], emoji: '😭', path: '/gifs/react-cry.gif' },
  { id: 'react-emotional', name: 'Emotional Eyes', categories: ['reactions', 'trending'], tags: ['emotional', 'tears', 'touched', 'sad', '🥹'], emoji: '🥹', path: '/gifs/react-emotional.gif' },
  { id: 'react-shock', name: 'Mind Blown', categories: ['reactions', 'trending'], tags: ['shock', 'mind blown', 'wow', 'omg', '🤯'], emoji: '🤯', path: '/gifs/react-shock.gif' },
  { id: 'react-nervous', name: 'Nervous Sweat', categories: ['reactions'], tags: ['nervous', 'sweat', 'anxious', 'scared', '😬'], emoji: '😬', path: '/gifs/react-nervous.gif' },
  { id: 'react-shrug', name: 'Shrug Confused', categories: ['reactions', 'random'], tags: ['shrug', 'confused', 'idk', 'whatever', '🤷'], emoji: '🤷', path: '/gifs/react-shrug.gif' },

  // 😎 Cool / Savage / Success
  { id: 'cool-shades', name: 'Cool Sunglasses', categories: ['reactions', 'trending'], tags: ['cool', 'sunglasses', 'swag', 'chill', '😎'], emoji: '😎', path: '/gifs/cool-shades.gif' },
  { id: 'cool-fire', name: 'Fire Burning', categories: ['celebration', 'trending'], tags: ['fire', 'lit', 'awesome', 'hot', '🔥'], emoji: '🔥', path: '/gifs/cool-fire.gif' },
  { id: 'cool-success', name: 'Rocket Success', categories: ['celebration', 'gaming'], tags: ['success', 'win', 'rocket', 'moon', 'up', '🚀'], emoji: '🚀', path: '/gifs/cool-success.gif' },
  { id: 'cool-perfect', name: '100 Perfect', categories: ['reactions'], tags: ['perfect', 'hundred', 'excellent', 'yes', '💯'], emoji: '💯', path: '/gifs/cool-perfect.gif' },
  { id: 'cool-savage', name: 'Savage Devil', categories: ['memes'], tags: ['savage', 'devil', 'evil', 'prank', '😈'], emoji: '😈', path: '/gifs/cool-savage.gif' },

  // 👍 Approval / Disapproval
  { id: 'appr-thumbsup', name: 'Thumbs Up', categories: ['reactions'], tags: ['ok', 'yes', 'thumbs up', 'approve', '👍'], emoji: '👍', path: '/gifs/appr-thumbsup.gif' },
  { id: 'appr-thumbsdown', name: 'Thumbs Down', categories: ['reactions'], tags: ['no', 'bad', 'thumbs down', 'disapprove', '👎'], emoji: '👎', path: '/gifs/appr-thumbsdown.gif' },
  { id: 'appr-clap', name: 'Clap Applause', categories: ['reactions', 'celebration'], tags: ['clap', 'applause', 'bravo', 'congrats', '👏'], emoji: '👏', path: '/gifs/appr-clap.gif' },
  { id: 'appr-respect', name: 'Respect Salute', categories: ['reactions'], tags: ['salute', 'respect', 'honor', 'military', '🫡'], emoji: '🫡', path: '/gifs/appr-respect.gif' },
  { id: 'appr-agree', name: 'Handshake Agreement', categories: ['reactions'], tags: ['handshake', 'agree', 'deal', 'agreement', 'partnership', '🤝'], emoji: '🤝', path: '/gifs/appr-agree.gif' },

  // 🙄 Silence / Eye Roll / Disgust
  { id: 'silent-eyeroll', name: 'Eye Roll', categories: ['reactions'], tags: ['eyeroll', 'whatever', 'bored', 'annoyed', '🙄'], emoji: '🙄', path: '/gifs/silent-eyeroll.gif' },
  { id: 'silent-neutral', name: 'Neutral Face', categories: ['reactions'], tags: ['neutral', 'silent', 'blank', 'bored', '😐'], emoji: '😐', path: '/gifs/silent-neutral.gif' },
  { id: 'silent-disgust', name: 'Disgust Green', categories: ['reactions'], tags: ['disgust', 'sick', 'gross', 'vomit', '🤢'], emoji: '🤢', path: '/gifs/silent-disgust.gif' },
  { id: 'silent-facepalm', name: 'Facepalm Face', categories: ['reactions', 'memes'], tags: ['facepalm', 'fail', 'dumb', 'stupid', '🤦'], emoji: '🤦', path: '/gifs/silent-facepalm.gif' },
  { id: 'silent-shhh', name: 'Silence Shhh', categories: ['reactions'], tags: ['shhh', 'silent', 'quiet', 'mute', '😑'], emoji: '😑', path: '/gifs/silent-shhh.gif' },

  // 😡 Angry / Frustrated / Rage
  { id: 'angry-red', name: 'Angry Rage', categories: ['reactions'], tags: ['angry', 'mad', 'rage', 'red', '😡'], emoji: '😡', path: '/gifs/angry-red.gif' },
  { id: 'angry-frustrated', name: 'Frustrated Steam', categories: ['reactions'], tags: ['frustrated', 'mad', 'steam', 'huff', '😤'], emoji: '😤', path: '/gifs/angry-frustrated.gif' },
  { id: 'angry-curse', name: 'Cursing Swear', categories: ['reactions'], tags: ['curse', 'swear', 'rage', 'censored', '🤬'], emoji: '🤬', path: '/gifs/angry-curse.gif' },

  // 🥳 Celebration / Party / Victory
  { id: 'party-celebrate', name: 'Celebration Horn', categories: ['celebration', 'trending'], tags: ['celebrate', 'party', 'confetti', 'yay', '🥳'], emoji: '🥳', path: '/gifs/party-celebrate.gif' },
  { id: 'party-confetti', name: 'Party Popper', categories: ['celebration'], tags: ['party', 'popper', 'confetti', 'happy', '🎉'], emoji: '🎉', path: '/gifs/party-confetti.gif' },
  { id: 'party-victory', name: 'Victory Hands', categories: ['celebration', 'reactions'], tags: ['victory', 'win', 'hands', 'cheer', '🙌'], emoji: '🙌', path: '/gifs/party-victory.gif' },

  // 💀 Dead / Clown / Drama / Watching
  { id: 'misc-dead', name: 'Dead Skull', categories: ['memes', 'trending'], tags: ['dead', 'skull', 'laughing', 'dying', '💀'], emoji: '💀', path: '/gifs/misc-dead.gif' },
  { id: 'misc-clown', name: 'Clown Face', categories: ['memes'], tags: ['clown', 'fool', 'joke', 'circus', '🤡'], emoji: '🤡', path: '/gifs/misc-clown.gif' },
  { id: 'misc-watching', name: 'Watching Eyes', categories: ['reactions', 'trending'], tags: ['watching', 'look', 'eyes', 'see', '👀'], emoji: '👀', path: '/gifs/misc-watching.gif' },
  { id: 'misc-drama', name: 'Popcorn Drama', categories: ['memes', 'trending'], tags: ['popcorn', 'drama', 'watching', 'movie', '🍿'], emoji: '🍿', path: '/gifs/misc-drama.gif' },
  { id: 'misc-awkward', name: 'Awkward Melting', categories: ['reactions'], tags: ['awkward', 'melt', 'embarrassed', 'shame', '🫠'], emoji: '🫠', path: '/gifs/misc-awkward.gif' },

  // 😴 Sleep / Sleepy / Tired
  { id: 'sleep-sleeping', name: 'Sleeping Zzz', categories: ['reactions', 'animals'], tags: ['sleep', 'tired', 'zzz', 'bed', '😴'], emoji: '😴', path: '/gifs/sleep-sleeping.gif' },

  // 🧠 Smart / Thinking
  { id: 'smart-brain', name: 'Smart Thinking', categories: ['reactions', 'gaming'], tags: ['smart', 'thinking', 'brain', 'intellectual', '🤔'], emoji: '🤔', path: '/gifs/smart-brain.gif' },
  { id: 'smart-pointing', name: 'Big Brain', categories: ['memes'], tags: ['smart', 'pointer', 'think', 'idea', '🧠'], emoji: '🧠', path: '/gifs/smart-pointing.gif' },

  // 🤖 AI
  { id: 'ai-robot', name: 'AI Robot', categories: ['gaming', 'random'], tags: ['ai', 'robot', 'future', 'technology', '🤖'], emoji: '🤖', path: '/gifs/ai-robot.gif' },

  // 🌚 Suspicious / Sarcasm / Random Meme
  { id: 'susp-moon', name: 'Suspicious Moon', categories: ['memes', 'reactions'], tags: ['suspicious', 'moon', 'creepy', 'shady', '🌚'], emoji: '🌚', path: '/gifs/susp-moon.gif' },
  { id: 'meme-random', name: 'Random Meme', categories: ['memes', 'random'], tags: ['meme', 'random', 'cat', 'dance', '😂'], emoji: '😂', path: '/gifs/meme-random.gif' },

  // Gaming
  { id: 'gaming-rage', name: 'Gamer Rage', categories: ['gaming', 'reactions'], tags: ['game', 'rage', 'controller', 'smash', '🤬'], emoji: '🤬', path: '/gifs/gaming-rage.gif' },
  { id: 'gaming-victory', name: 'Victory Royale', categories: ['gaming', 'celebration'], tags: ['win', 'victory', 'gg', 'gamer', '🚀'], emoji: '🚀', path: '/gifs/gaming-victory.gif' },

  // Anime
  { id: 'anime-wow', name: 'Anime Shock', categories: ['anime', 'reactions'], tags: ['anime', 'shock', 'wow', 'eyes', '🤯'], emoji: '🤯', path: '/gifs/anime-wow.gif' },
  { id: 'anime-happy', name: 'Anime Happy Dance', categories: ['anime', 'celebration'], tags: ['anime', 'happy', 'dance', 'cute', '✨'], emoji: '✨', path: '/gifs/anime-happy.gif' },
  { id: 'anime-cry', name: 'Anime Tears', categories: ['anime'], tags: ['anime', 'cry', 'sad', 'tears', '😭'], emoji: '😭', path: '/gifs/anime-cry.gif' }
];

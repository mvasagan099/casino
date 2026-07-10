import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

const games = [
  { name: 'Dice', slug: 'dice', description: 'Classic dice game with over/under betting', edge: 1.00, minBet: 0.10, maxBet: 10000 },
  { name: 'Limbo', slug: 'limbo', description: 'Bet on a target multiplier and see if you win', edge: 1.00, minBet: 0.10, maxBet: 10000 },
  { name: 'Mines', slug: 'mines', description: 'Reveal tiles and avoid mines to grow your multiplier', edge: 1.00, minBet: 0.10, maxBet: 1000 },
  { name: 'Crash', slug: 'crash', description: 'Cash out before the rocket crashes', edge: 1.00, minBet: 0.10, maxBet: 10000 },
  { name: 'Plinko', slug: 'plinko', description: 'Drop the ball and land on a multiplier', edge: 1.00, minBet: 0.10, maxBet: 5000 },
  { name: 'Keno', slug: 'keno', description: 'Pick numbers and match the draw', edge: 1.00, minBet: 0.10, maxBet: 5000 },
  { name: 'Wheel', slug: 'wheel', description: 'Spin the wheel and win multipliers', edge: 1.00, minBet: 0.10, maxBet: 5000 },
  { name: 'Hilo', slug: 'hilo', description: 'Guess higher or lower than the next card', edge: 1.00, minBet: 0.10, maxBet: 5000 },
  { name: 'Bars', slug: 'bars', description: 'Spin the slot reels to match symbols', edge: 1.00, minBet: 0.10, maxBet: 5000 },
  { name: 'Drill', slug: 'drill', description: 'Drill through rows and avoid rocks', edge: 1.00, minBet: 0.10, maxBet: 5000 },
  { name: 'Darts', slug: 'darts', description: 'Throw a dart at the board and land on a multiplier', edge: 1.00, minBet: 0.10, maxBet: 5000 },
  { name: 'Diamonds', slug: 'diamonds', description: 'Roll 5 diamonds and get a poker-like hand', edge: 1.00, minBet: 0.10, maxBet: 5000 },
  { name: 'Flip', slug: 'flip', description: 'Flip coins and predict the outcome', edge: 1.00, minBet: 0.10, maxBet: 5000 },
  { name: 'PrimeDice', slug: 'primedice', description: 'Roll a number and bet on a range', edge: 1.00, minBet: 0.10, maxBet: 10000 },
  { name: 'Slide', slug: 'slide', description: 'Slide to your target multiplier before the crash', edge: 1.00, minBet: 0.10, maxBet: 5000 },
  { name: 'Moles', slug: 'moles', description: 'Hit the moles hiding in the holes', edge: 1.00, minBet: 0.10, maxBet: 5000 },
  { name: 'Pump', slug: 'pump', description: 'Pump the balloon without bursting it', edge: 1.00, minBet: 0.10, maxBet: 5000 },
  { name: 'Chicken', slug: 'chicken', description: 'Cross the road safely to earn multipliers', edge: 1.00, minBet: 0.10, maxBet: 5000 },
  { name: 'RPS', slug: 'rps', description: 'Build a winning streak in Rock Paper Scissors', edge: 1.00, minBet: 0.10, maxBet: 5000 },
  { name: 'Blackjack', slug: 'blackjack', description: 'Classic blackjack against the dealer', edge: 1.00, minBet: 0.10, maxBet: 5000 },
];

async function main() {
  console.log('Seeding games...');
  for (const game of games) {
    await prisma.game.upsert({
      where: { slug: game.slug },
      update: { name: game.name, description: game.description, isActive: true },
      create: game,
    });
    console.log(`  ✅ ${game.name}`);
  }
  console.log('Done!');
}

main()
  .catch(console.error)
  .finally(() => prisma.$disconnect());

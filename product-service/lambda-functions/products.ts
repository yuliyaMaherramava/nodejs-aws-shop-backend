export interface Product {
  id: string;
  title: string;
  description: string;
  price: number;
}

export const products: Product[] = [
  {
    id: "1",
    title: "Monopoly",
    description:
      "It is a Family Game Night staple! Players buy, sell, dream, and scheme their way to riches with the Monopoly board game",
    price: 19.22,
  },
  {
    id: "2",
    title: "Code names",
    description:
      "Work together to contact all of your agents before the other team",
    price: 17.99,
  },
  {
    id: "3",
    title: "CATAN",
    description:
      "Set sail to the uncharted island of Catan and compete with other settlers to establish supremacy.Strategically gather and trade resources like ore, brick, lumber, grain, and wool to expand your settlements.Use your resources to build roads, settlements, and cities to earn victory points.",
    price: 43.97,
  },
  {
    id: "4",
    title: "Scrabble",
    description:
      "Get family and friends together for a fun game night with the Scrabble board game! Put letters together, build words, and earn the most points to win",
    price: 19.94,
  },
  {
    id: "5",
    title: "Ticket to Ride",
    description:
      " Race to build your train routes across iconic American cities in this award-winning board game.Challenge friends and family in a 2-5 player game, where every move counts.",
    price: 43.97,
  },
];

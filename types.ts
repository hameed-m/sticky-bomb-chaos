export type Vector2 = { x: number; y: number };

export enum PlayerState {
  IDLE,
  RUNNING,
  JUMPING,
  FALLING,
  DEAD
}

export enum BombState {
  SPAWNING, // Waiting to be picked up
  HELD,     // In player's hand
  THROWN,   // Flying through air
  STUCK,    // Glued to a player
  EXPLODING // Visual explosion
}

export type GameStatus = 'START' | 'PLAYING' | 'OVER';

export interface Rect {
  x: number;
  y: number;
  w: number;
  h: number;
}

export interface Player {
  id: 1 | 2;
  pos: Vector2;
  vel: Vector2;
  size: Vector2;
  color: string;
  hp: number;
  maxHp: number;
  facingRight: boolean;
  isGrounded: boolean;
  canDoubleJump: boolean;
  state: PlayerState;
  respawnTimer: number;
  score: number;
  // Animation
  animFrame: number;
  animTimer: number;
  animRow: number;
}

export interface Bomb {
  active: boolean;
  pos: Vector2;
  vel: Vector2;
  radius: number;
  state: BombState;
  ownerId: 1 | 2 | null; // Who currently has it / stuck with it
  timer: number; // Time until explosion
  transferCooldown: number; // Prevents instant back-and-forth
  stickCooldown: number; // Delay before sticking after throw
  spawnTimer: number; // Time until next spawn
}

export interface Particle {
  id: number;
  pos: Vector2;
  vel: Vector2;
  life: number;
  color: string;
  size: number;
}

export interface Platform extends Rect {
  type: 'ground' | 'platform';
}

export interface GameSettings {
  matchDuration: number;
  winScore: number;
}

export interface GameState {
  players: Player[];
  bomb: Bomb;
  particles: Particle[];
  winner: number | null;
  isRunning: boolean;
  timeLeft: number;
}
import { Platform } from './types';

// Canvas Dimensions
export const CANVAS_WIDTH = 1280;
export const CANVAS_HEIGHT = 720;

// Physics
export const GRAVITY = 0.6;
export const FRICTION = 0.85;
export const MOVE_SPEED = 1.2; // Acceleration
export const MAX_SPEED = 8;
export const JUMP_FORCE = -14;
export const DOUBLE_JUMP_FORCE = -12;
export const FAST_FALL_SPEED = 1.5; // Added to gravity

// Game Mechanics
export const FPS = 60;
export const BOMB_FUSE_TIME = 10; // Seconds
export const BOMB_SPAWN_INTERVAL = 3; // Reduced from 15 to 3
export const EXPLOSION_DAMAGE = 50;
export const EXPLOSION_RADIUS = 150;
export const KNOCKBACK_FORCE = 15;
export const TRANSFER_COOLDOWN = 1; // Seconds
export const BOMB_STICK_DELAY = 0.2; // Seconds before bomb can stick after throw
export const RESPAWN_TIME = 3; // Seconds
export const MATCH_DURATION_DEFAULT = 180; // Seconds (3 mins)
export const WIN_SCORE_DEFAULT = 3;

// Visuals
export const SPRITE_SIZE = 32; // Source size (32x32)
export const SPRITE_SCALE = 2.5; // Display scale
export const ANIM_SPEED = 0.15; // Seconds per frame

// Map Design
export const PLATFORMS: Platform[] = [
  // Main Ground - Full Width
  { x: 0, y: 650, w: 1280, h: 70, type: 'ground' },
  // Left Floater
  { x: 200, y: 450, w: 250, h: 20, type: 'platform' },
  // Right Floater
  { x: 830, y: 450, w: 250, h: 20, type: 'platform' },
  // Top Center
  { x: 515, y: 250, w: 250, h: 20, type: 'platform' },
];

export const BOUNDS = {
  left: 0,
  right: 1280,
  top: 0,
  bottom: 720
};

export const SPAWN_NODES = [
  { x: 640, y: 580 }, // Ground Center
  { x: 325, y: 380 }, // Left Plat
  { x: 955, y: 380 }, // Right Plat
  { x: 640, y: 200 }, // Top Plat
];
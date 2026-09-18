import { prisma } from "@/lib/prisma";
import { msElapsed } from "@/lib/chairsEngine";
import { pickWordChoices, isCorrectGuess } from "@/lib/drawingWords";

async function raw(code: string) {
  return prisma.drawingRoom.findUnique({
    where: { code: code.toUpperCase() },
    include: { players: { orderBy: { joinOrder: "asc" } } }
  });
}
async function rawById(id: string) {
  return prisma.drawingRoom.findUniqueOrThrow({
    where: { id },
    include: { players: { orderBy: { joinOrder: "asc" } } }
  });
}
type DrawingRoomWithPlayers = NonNullable<Awaited<ReturnType<typeof raw>>>;

export function currentDrawer(room: DrawingRoomWithPlayers) {
  if (room.players.length === 0) return null;
  return room.players[room.drawerIndex % room.players.length] ?? null;
}

export async function loadDrawingRoom(code: string): Promise<DrawingRoomWithPlayers | null> {
  let room = await raw(code);
  if (!room) return null;

  // Drawer took too long to pick a word → auto-pick one so the room doesn't stall.
  if (room.status === "CHOOSING" && room.phaseStartAt && msElapsed(room.phaseStartAt) >= room.chooseSeconds * 1000) {
    const choices: string[] = JSON.parse(room.wordChoices);
    const word = choices[0] ?? pickWordChoices(1)[0]!;
    room = await prisma.drawingRoom.update({
      where: { id: room.id },
      data: { status: "DRAWING", currentWord: word, strokes: "[]", correctLogins: "[]", phaseStartAt: new Date() },
      include: { players: { orderBy: { joinOrder: "asc" } } }
    });
  }

  if (room.status === "DRAWING" && room.phaseStartAt && msElapsed(room.phaseStartAt) >= room.drawSeconds * 1000) {
    await advanceDrawingRound(room.id);
    room = await rawById(room.id);
  }

  return room;
}

/** Starts (or restarts) the game: picks the next drawer in rotation and hands
 *  them 3 word choices to pick from. */
export async function startDrawingRound(roomId: string) {
  const room = await prisma.drawingRoom.findUniqueOrThrow({ where: { id: roomId }, include: { players: true } });
  if (room.players.length < 2) throw new Error("لازم لاعبين اثنين على الأقل");

  const isNewGame = room.round === 0 || room.status === "FINISHED";
  if (room.status === "FINISHED") {
    await prisma.drawingPlayer.updateMany({ where: { roomId }, data: { score: 0 } });
  }

  const nextDrawerIndex = isNewGame ? 0 : (room.drawerIndex + 1) % room.players.length;
  await prisma.drawingRoom.update({
    where: { id: roomId },
    data: {
      status: "CHOOSING",
      round: isNewGame ? 1 : room.round + 1,
      drawerIndex: nextDrawerIndex,
      wordChoices: JSON.stringify(pickWordChoices(3)),
      currentWord: "",
      strokes: "[]",
      correctLogins: "[]",
      phaseStartAt: new Date()
    }
  });
}

export async function chooseDrawingWord(roomId: string, login: string, word: string) {
  const room = await prisma.drawingRoom.findUniqueOrThrow({ where: { id: roomId }, include: { players: true } });
  if (room.status !== "CHOOSING") throw new Error("مو وقت اختيار الكلمة");
  const drawer = currentDrawer(room);
  if (!drawer || drawer.login !== login) throw new Error("بس الرسّام يختار الكلمة");
  const choices: string[] = JSON.parse(room.wordChoices);
  if (!choices.includes(word)) throw new Error("اختيار غير صالح");

  await prisma.drawingRoom.update({
    where: { id: roomId },
    data: { status: "DRAWING", currentWord: word, strokes: "[]", correctLogins: "[]", phaseStartAt: new Date() }
  });
}

export interface StrokePoint { x: number; y: number }
export interface Stroke { points: StrokePoint[]; color: string; width: number }

export async function addDrawingStroke(roomId: string, login: string, stroke: Stroke) {
  const room = await prisma.drawingRoom.findUniqueOrThrow({ where: { id: roomId }, include: { players: true } });
  if (room.status !== "DRAWING") throw new Error("مو وقت الرسم");
  const drawer = currentDrawer(room);
  if (!drawer || drawer.login !== login) throw new Error("بس الرسّام يقدر يرسم");

  const strokes: Stroke[] = JSON.parse(room.strokes);
  strokes.push(stroke);
  // Cap history so the JSON blob doesn't grow unbounded across a long round.
  const trimmed = strokes.slice(-400);
  await prisma.drawingRoom.update({ where: { id: roomId }, data: { strokes: JSON.stringify(trimmed) } });
}

export async function clearDrawingCanvas(roomId: string, login: string) {
  const room = await prisma.drawingRoom.findUniqueOrThrow({ where: { id: roomId }, include: { players: true } });
  if (room.status !== "DRAWING") throw new Error("مو وقت الرسم");
  const drawer = currentDrawer(room);
  if (!drawer || drawer.login !== login) throw new Error("بس الرسّام يقدر يمسح");
  await prisma.drawingRoom.update({ where: { id: roomId }, data: { strokes: "[]" } });
}

/** Correct guess → points for the guesser (more if they're fast) and a smaller
 *  bonus for the drawer, same "reward for landing the answer" idea as the
 *  original chat-based version. */
export async function submitDrawingGuess(roomId: string, login: string, text: string) {
  const room = await prisma.drawingRoom.findUniqueOrThrow({ where: { id: roomId }, include: { players: true } });
  if (room.status !== "DRAWING") return { correct: false };
  const drawer = currentDrawer(room);
  const guesser = room.players.find((p) => p.login === login);
  if (!guesser || !drawer || guesser.id === drawer.id) return { correct: false };

  const correctLogins: string[] = JSON.parse(room.correctLogins);
  if (correctLogins.includes(login)) return { correct: true, alreadyGuessed: true };
  if (!isCorrectGuess(text, room.currentWord)) return { correct: false };

  const elapsedSecs = room.phaseStartAt ? msElapsed(room.phaseStartAt) / 1000 : room.drawSeconds;
  const speedBonus = Math.max(0, Math.round(room.drawSeconds - elapsedSecs));
  const points = 10 + speedBonus;

  await prisma.$transaction([
    prisma.drawingPlayer.update({ where: { id: guesser.id }, data: { score: { increment: points } } }),
    prisma.drawingPlayer.update({ where: { id: drawer.id }, data: { score: { increment: 3 } } }),
    prisma.drawingRoom.update({
      where: { id: roomId },
      data: { correctLogins: JSON.stringify([...correctLogins, login]) }
    })
  ]);

  // Everyone (but the drawer) guessed it → move on right away.
  const updatedCorrect = [...correctLogins, login];
  const guessers = room.players.filter((p) => p.id !== drawer.id);
  if (updatedCorrect.length >= guessers.length) {
    await advanceDrawingRound(roomId);
  }

  return { correct: true, points };
}

/** Ends the current drawing round and either starts the next one (rotating the
 *  drawer) or finishes the game once every player has had their turn. */
export async function advanceDrawingRound(roomId: string) {
  const room = await prisma.drawingRoom.findUniqueOrThrow({ where: { id: roomId }, include: { players: true } });
  if (room.round >= room.roundLimit) {
    await prisma.drawingRoom.update({ where: { id: roomId }, data: { status: "FINISHED" } });
    return;
  }
  await startDrawingRound(roomId);
}

export async function serializeDrawingRoom(roomId: string, viewerLogin?: string) {
  const room = await prisma.drawingRoom.findUniqueOrThrow({
    where: { id: roomId },
    include: { players: { orderBy: { joinOrder: "asc" } } }
  });
  const drawer = currentDrawer(room);
  const isDrawer = !!drawer && drawer.login === viewerLogin;
  const correctLogins: string[] = JSON.parse(room.correctLogins);
  const revealWord = room.status === "FINISHED" || (room.status === "DRAWING" && correctLogins.includes(viewerLogin ?? ""));

  return {
    code: room.code,
    status: room.status,
    round: room.round,
    roundLimit: room.roundLimit,
    drawSeconds: room.drawSeconds,
    chooseSeconds: room.chooseSeconds,
    phaseStartAt: room.phaseStartAt,
    drawerLogin: drawer?.login ?? null,
    drawerName: drawer?.name ?? null,
    isDrawer,
    wordChoices: isDrawer && room.status === "CHOOSING" ? (JSON.parse(room.wordChoices) as string[]) : [],
    wordLength: room.currentWord ? room.currentWord.replace(/\s/g, "").length : 0,
    word: isDrawer || revealWord ? room.currentWord : null,
    strokes: JSON.parse(room.strokes) as unknown[],
    hasGuessedCorrectly: correctLogins.includes(viewerLogin ?? ""),
    correctCount: correctLogins.length,
    players: room.players
      .map((p) => ({ id: p.id, login: p.login, name: p.name, color: p.color, letter: p.letter, isHost: p.isHost, score: p.score }))
      .sort((a, b) => b.score - a.score)
  };
}

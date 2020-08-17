import * as FaundaDb from 'faunadb';
import { User } from 'telegraf/typings/telegram-types';

const Indexes = {
  UserIdIndex: 'UserIdIndex',
  RoomIdIndex: 'RoomIdIndex',
  LastSessionIndex: 'LastSessionIndex',
  LastQuestionIndex: 'QuestionIndex',
};

const Collections = {
  User: 'user',
  Room: 'room',
  Session: 'session',
  Quiz: 'question',
};

type FCollection<T> = {
  ref: any;
  ts: number;
  data: T;
};

export type Room = {
  roomId: number;
  active: boolean;
  players: Array<User>;
};

export type QuizSession = {
  roomId: number;
  session: number;
};

export type Quiz = {
  sessionId: number;
  question: string;
  answer: string;
};

export type SimpleQuiz = {
  question: string;
  answer: string;
};

const client = new FaundaDb.Client({
  secret: process.env.FAUNA_TOKEN,
  timeout: 2000,
});
const q = FaundaDb.query;

export async function newUser(from: any): Promise<FCollection<User>> | null {
  const isExist = await client.query(
    q.Exists(q.Match(q.Index(Indexes.UserIdIndex), from.id)),
  );
  if (isExist) return Promise.resolve(null);

  return client.query(q.Create(q.Collection(Collections.User), { data: from }));
}

export async function getGameRoom(roomId: any): Promise<FCollection<Room>> {
  return new Promise(resolve => {
    client
      .query(q.Get(q.Match(q.Index(Indexes.RoomIdIndex), roomId)))
      .then(result => {
        resolve(result as FCollection<Room>);
      })
      .catch(() => {
        resolve(null);
      });
  });
}

export async function createGameRoom(id: any, user: User) {
  return client.query(
    q.Create(q.Collection(Collections.Room), {
      data: {
        roomId: id,
        active: false,
        players: [user],
      },
    }),
  );
}

export async function setPlayerToRoom(roomId: number, players: Array<User>) {
  return client.query(
    q.Update(
      q.Select('ref', q.Get(q.Match(q.Index(Indexes.RoomIdIndex), roomId))),
      {
        data: {
          players: players,
        },
      },
    ),
  );
}

export async function setGameRoomActive(roomId: number, isActive: boolean) {
  return client.query(
    q.Update(selectRoomById(roomId), {
      data: {
        active: isActive,
      },
    }),
  );
}

export async function createSession(
  roomId: number,
): Promise<FCollection<QuizSession>> {
  return client.query(
    q.Create(q.Collection(Collections.Session), {
      data: {
        roomId: roomId,
        session: Date.now(),
      },
    }),
  );
}

export async function createQuestion(session: QuizSession, quiz: SimpleQuiz) {
  return client.query(
    q.Create(q.Collection(Collections.Quiz), {
      data: {
        sessionId: session.roomId + session.session,
        answer: quiz.answer,
        question: quiz.question,
      },
    }),
  );
}

export async function getLastQuestion(
  groupId: number,
): Promise<FCollection<Quiz>> {
  const lastSession: FCollection<QuizSession> = await client.query(
    q.Get(q.Match(q.Index(Indexes.LastSessionIndex), groupId)),
  );
  const { data } = lastSession;
  const sessionId = data.roomId + data.session;

  return client.query(
    q.Get(q.Match(q.Index(Indexes.LastQuestionIndex), sessionId)),
  );
}

/* Queries */
/* ------------------------------------------ */

function selectRoomById(roomId: number) {
  return q.Select('ref', q.Get(q.Match(q.Index(Indexes.RoomIdIndex), roomId)));
}

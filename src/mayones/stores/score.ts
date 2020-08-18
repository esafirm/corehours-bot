import * as FaundaDb from 'faunadb';
import { User } from 'telegraf/typings/telegram-types';
import { Indexes, Collections, FCollection, Score } from './types';

const q = FaundaDb.query;

export default class ScoreStore {
  client: FaundaDb.Client;

  constructor(client: FaundaDb.Client) {
    this.client = client;
  }

  findScore(sessionId: number): Promise<FCollection<Score> | null> {
    return new Promise(resolve => {
      this.client
        .query(q.Match(q.Index(Indexes.ScoreIndex), sessionId))
        .then(res => {
          resolve(res as FCollection<Score>);
        })
        .catch(() => {
          resolve(null);
        });
    });
  }

  createScore(sessionId: number): Promise<FCollection<Score>> {
    return this.client.query(
      q.Create(q.Collection(Collections.Score), {
        data: {
          sessionId: sessionId,
          player: [],
        },
      }),
    );
  }

  async findOrCreateScore(sessionId: number): Promise<FCollection<Score>> {
    const currentScore = await this.findScore(sessionId);
    if (currentScore == null) {
      return await this.createScore(sessionId);
    }
    return currentScore;
  }

  async giveScore(from: User, sessionId: number) {
    const currentScore = await this.findOrCreateScore(sessionId);
    console.log('current score', currentScore);

    const currentPlayerScore = currentScore.data.scores[from.username];
    const newPlayerScore =
      currentPlayerScore === null ? 1 : currentPlayerScore + 1;

    const newScore = {
      ...currentScore.data,
      scores: {
        ...currentScore.data.scores,
        [from.username]: newPlayerScore,
      },
    };

    return this.client.query(
      q.Update(q.Match(q.Index(Indexes.ScoreIndex), sessionId), newScore),
    );

    this.client.query(q.Match(q.Index(Indexes.ScoreIndex), sessionId));
  }
}
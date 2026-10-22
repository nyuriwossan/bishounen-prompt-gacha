/* テストごとに一度だけイベントループへ制御を返す。
 * 同期処理の長いテストが続くと、テストランナーとの通信（onTaskUpdate の応答）が処理されないまま60秒を超え、
 * vitest が「Timeout calling "onTaskUpdate"」で失敗することがある（CPUの少ない環境で再現）。テストの中身には影響しない。 */
import { afterEach } from 'vitest';

afterEach(() => new Promise<void>((resolve) => setImmediate(resolve)));

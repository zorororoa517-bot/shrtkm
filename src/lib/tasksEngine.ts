export type TaskStatKey = "hostedToday" | "winsToday" | "eliminationsToday" | "totalWins" | "totalHosted";

export interface TaskDef {
  id: string;
  title: string;
  icon: string;
  stat: TaskStatKey;
  target: number;
  reward: number;
  period: "daily" | "all"; // "daily" resets every calendar day, "all" is a one-time lifetime goal
}

// مهام ثابتة (بدل السحب العشوائي اليومي بالنسخة القديمة) مبنية على إحصائيات
// حقيقية موجودة أصلاً بقاعدة البيانات (جولات مستضافة، فوز، طرد بعجلة الشخصنة).
export const TASK_DEFS: TaskDef[] = [
  { id: "d_host1", title: "شغّل جولة واحدة اليوم (أي لعبة)", icon: "🎬", stat: "hostedToday", target: 1, reward: 50, period: "daily" },
  { id: "d_host3", title: "شغّل 3 جولات اليوم", icon: "🎬", stat: "hostedToday", target: 3, reward: 120, period: "daily" },
  { id: "d_win1", title: "حقق فوز واحد اليوم", icon: "🏆", stat: "winsToday", target: 1, reward: 70, period: "daily" },
  { id: "d_elim5", title: "اطرد 5 مشاركين بعجلة الشخصنة اليوم", icon: "🎯", stat: "eliminationsToday", target: 5, reward: 90, period: "daily" },
  { id: "a_wins10", title: "حقق 10 فوزات إجمالاً", icon: "⭐", stat: "totalWins", target: 10, reward: 200, period: "all" },
  { id: "a_wins30", title: "حقق 30 فوز إجمالاً", icon: "🌟", stat: "totalWins", target: 30, reward: 500, period: "all" },
  { id: "a_hosted20", title: "استضف 20 جولة إجمالاً", icon: "🎪", stat: "totalHosted", target: 20, reward: 300, period: "all" }
];

export function todayKey(): string {
  return new Date().toISOString().slice(0, 10); // YYYY-MM-DD (يوم الخادم التقويمي)
}

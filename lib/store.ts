// Almacén del prototipo: todo vive en localStorage del navegador.
// El coach y el cliente comparten los mismos datos, así el flujo
// asignar rutina → cliente la ve → cliente marca → coach ve progreso
// funciona de punta a punta sin backend.

import {
  buildRoutine,
  type Exercise,
  type Level,
  type Routine,
  type RoutineItem,
  type Sex,
} from "@/lib/routine";

// Un ajuste hecho a la rutina: por el coach (editó algo) o por el
// cliente (pidió subir el peso al terminar una sesión)
export interface Adjustment {
  dateLabel: string;
  by: "coach" | "cliente";
  text: string;
}

// Una rutina guardada del cliente, con su avance propio
export interface SavedRoutine {
  id: string;
  // Quién la creó: el coach (por defecto) o el propio cliente
  createdBy?: "coach" | "cliente";
  routine: Routine;
  // Ids de ejercicios completados de la sesión actual de ESTA rutina
  done: string[];
  // Cuántas veces la completó y cuándo fue la última
  timesDone: number;
  lastDoneDate?: string; // AAAA-MM-DD
  // Historial de ajustes (coach y cliente)
  adjustments: Adjustment[];
}

// Registro de lo que hizo un día que vino a entrenar
export interface DayLog {
  day: number; // 0 = lunes … 6 = domingo
  routineTitle: string;
  completed: number;
  total: number;
  exercises: string[];
  // Respuestas del cliente al terminar la sesión
  moreWeight?: boolean;
  comfortable?: boolean;
}

// Un registro del peso corporal del cliente
export interface WeightEntry {
  dateLabel: string;
  weightKg: number;
}

export interface StoredClient {
  id: string;
  name: string;
  // Código de acceso que el coach le da al cliente (login simple)
  code: string;
  plan: "Mensual" | "Coaching PRO";
  // Nivel de la ficha: se define una vez al crear al cliente
  level: Level;
  sex: Sex;
  goal: string;
  // Pack de clases personales con el coach (opcional)
  sessionsPack?: {
    total: number;
    used: number;
    // Próxima clase juntos: 0 = lunes … 6 = domingo, null = por agendar
    nextDay: number | null;
  };
  // Ficha física (opcional)
  heightCm?: number;
  weightKg?: number;
  // Historial de peso corporal (para ver avances)
  weightHistory: WeightEntry[];
  // Asistencia de la semana, lunes a domingo
  week: boolean[];
  // Todas las rutinas que el coach le ha creado
  routines: SavedRoutine[];
  // Qué rutina hizo cada día que vino (semana actual)
  history: DayLog[];
  // Semanas anteriores (para la vista mensual), de la más antigua a la más reciente
  pastWeeks: boolean[][];
  // Última fecha en que abrió su sesión (para reiniciar la sesión cada día)
  lastActiveDate?: string;
  // Lunes de la semana que está corriendo (para rotar la semana el lunes)
  weekStartDate?: string;
  lastSeen: string;
}

export type Session =
  | { type: "coach" }
  | { type: "client"; clientId: string }
  | null;

// v6: pack de clases con el coach + horario del coach
const CLIENTS_KEY = "fitevo:clients:v6";
const COACH_KEY = "fitevo:coach:v1";
const SESSION_KEY = "fitevo:session:v1";

// Código del entrenador (en producción sería un usuario real)
export const COACH_CODE = "COACH";

function saved(
  id: string,
  routine: Routine,
  done: string[] = [],
  extra: Partial<SavedRoutine> = {}
): SavedRoutine {
  return { id, routine, done, timesDone: 0, adjustments: [], ...extra };
}

// Fecha local AAAA-MM-DD (¡no UTC! así el "día" cambia a medianoche local)
function localISO(date: Date): string {
  const year = date.getFullYear();
  const month = String(date.getMonth() + 1).padStart(2, "0");
  const day = String(date.getDate()).padStart(2, "0");
  return `${year}-${month}-${day}`;
}

// Fecha AAAA-MM-DD desplazada N días hacia atrás desde hoy (para las semillas)
function daysAgoISO(days: number): string {
  const date = new Date();
  date.setDate(date.getDate() - days);
  return localISO(date);
}

// Lunes de la semana actual (para saber cuándo rotar la semana)
export function mondayISO(): string {
  const date = new Date();
  const day = date.getDay();
  date.setDate(date.getDate() - (day === 0 ? 6 : day - 1));
  return localISO(date);
}

// Etiqueta legible de la última vez que hizo la rutina
export function lastDoneLabel(iso?: string): string {
  if (!iso) return "nunca";
  const today = new Date();
  today.setHours(0, 0, 0, 0);
  const then = new Date(`${iso}T00:00:00`);
  const diff = Math.round((today.getTime() - then.getTime()) / 86400000);
  if (diff <= 0) return "hoy";
  if (diff === 1) return "ayer";
  return `hace ${diff} días`;
}

function log(
  day: number,
  routine: Routine,
  completed: number
): DayLog {
  return {
    day,
    routineTitle: routine.title,
    completed,
    total: routine.items.length,
    exercises: routine.items.map((item) => item.exercise.name),
  };
}

// Añade pesos de ejemplo a una rutina (como los pondría el coach)
function withWeights(routine: Routine, weights: string[]): Routine {
  return {
    ...routine,
    items: routine.items.map((item, i) => ({ ...item, weight: weights[i] })),
  };
}

// Ejercicio con nombre propio (como los anota el coach o el cliente)
function customExercise(
  id: string,
  name: string,
  machine: string,
  movement: Exercise["movement"],
  equipment: Exercise["equipment"],
  tip: string
): Exercise {
  return {
    id,
    name,
    machine,
    equipment,
    movement,
    muscle: movement === "agarre" ? "Espalda y bíceps" : movement === "empuje" ? "Pecho, hombro y tríceps" : "Pierna",
    group: ["full-body"],
    difficulty: 2,
    tip,
  };
}

function item(
  exercise: Exercise,
  sets: number,
  reps: string,
  weight?: string
): RoutineItem {
  return { exercise, sets, reps, restSeconds: 75, weight };
}

function seedClients(): StoredClient[] {
  const mariaPierna = withWeights(
    { ...buildRoutine("pierna", "intermedio", "mujer"), day: 2 },
    ["20 kg", "35 kg", "50 kg", "25 kg", "15 kg"]
  );
  const mariaFull = { ...buildRoutine("full-body", "intermedio", "mujer"), day: null };
  const josePecho = { ...buildRoutine("pecho-brazos", "avanzado", "hombre"), day: 0 };
  const joseEspalda = { ...buildRoutine("espalda", "avanzado", "hombre"), day: 3 };
  const andreaFull = { ...buildRoutine("full-body", "principiante", "mujer"), day: null };
  const ricardoEspalda = { ...buildRoutine("espalda", "intermedio", "hombre"), day: 1 };

  const aleAgarre: Routine = {
    title: "Rutina · Agarre",
    subtitle: "Armada por tu coach · 4 ejercicios · descansos de 75s",
    durationMinutes: 40,
    day: null,
    items: [
      item(
        customExercise("ale-abierto", "Abierto pecho para atrás", "Polea alta (jalón)", "agarre", "maquina", "Pecho abierto, lleva la barra hacia atrás controlado."),
        4, "12-14", "35 kg"
      ),
      item(
        customExercise("ale-4dedos", "Agarre 4 dedos", "Polea alta (jalón)", "agarre", "maquina", "Agarre con 4 dedos, sin el pulgar."),
        4, "8", "35 kg"
      ),
      item(
        customExercise("ale-curl", "Curl de bíceps", "Polea baja", "agarre", "maquina", "Codos pegados al cuerpo."),
        4, "12", "10 kg"
      ),
      item(
        customExercise("ale-remo-bajo", "Polea remo bajo", "Polea de remo", "agarre", "maquina", "Saca pecho y lleva los codos atrás."),
        4, "10", "20 kg"
      ),
    ],
  };

  const aleEmpuje: Routine = {
    title: "Rutina · Empuje",
    subtitle: "Armada por tu coach · 8 ejercicios · descansos de 75s",
    durationMinutes: 55,
    day: null,
    items: [
      item(
        customExercise("ale-laterales", "Laterales", "Mancuernas", "empuje", "pesas", "Sube hasta la altura de los hombros."),
        4, "10", "10 kg"
      ),
      item(
        customExercise("ale-pajarito", "Pajarito", "Mancuernas", "empuje", "pesas", "Tronco inclinado, abre como alas."),
        4, "10-12", "5 kg"
      ),
      item(
        customExercise("ale-frontal", "Frontal", "Mancuernas", "empuje", "pesas", "Sube al frente hasta los ojos."),
        4, "16"
      ),
      item(
        customExercise("ale-copa", "En copa", "Mancuerna", "empuje", "pesas", "Sujeta la mancuerna como copa sobre la cabeza."),
        4, "14", "5 kg"
      ),
      item(
        customExercise("ale-empuje-abajo", "Empuje hacia abajo", "Polea alta", "empuje", "maquina", "Codos fijos, empuja solo con el antebrazo."),
        4, "16", "30 kg"
      ),
      item(
        customExercise("ale-triceps-cuerda", "Extensión de tríceps unilateral con cuerda", "Polea alta", "empuje", "maquina", "Un brazo a la vez, controla la vuelta."),
        4, "12", "10 kg c/brazo"
      ),
      item(
        customExercise("ale-press-vertical", "Press de pecho vertical (empuje hacia arriba)", "Máquina press de pecho", "empuje", "maquina", "Empuja hacia arriba sin bloquear codos."),
        4, "10"
      ),
      item(
        customExercise("ale-spiderman", "Aplausos de Spiderman", "Colchoneta", "empuje", "cuerpo", "Flexión con palmada, explosivo."),
        4, "10"
      ),
    ],
  };

  const alePierna: Routine = {
    ...buildRoutine("pierna", "intermedio", "hombre"),
    title: "Rutina · Pierna",
    day: null,
  };

  return [
    {
      id: "c5",
      name: "Alejandro Rivera",
      code: "ALE",
      plan: "Coaching PRO",
      level: "intermedio",
      sex: "hombre",
      goal: "Ganar fuerza y músculo",
      sessionsPack: { total: 4, used: 3, nextDay: 4 },
      weightHistory: [],
      week: [false, false, true, false, false, false, false],
      routines: [
        saved("r-ale-1", aleAgarre, [], {
          timesDone: 1,
          lastDoneDate: daysAgoISO(8),
          adjustments: [{ dateLabel: "hace 1 semana", by: "coach", text: "Creó la rutina" }],
        }),
        saved("r-ale-2", aleEmpuje, [], {
          timesDone: 1,
          lastDoneDate: daysAgoISO(6),
          adjustments: [{ dateLabel: "hace 1 semana", by: "coach", text: "Creó la rutina" }],
        }),
        saved("r-ale-3", alePierna, alePierna.items.map((routineItem) => routineItem.exercise.id), {
          timesDone: 1,
          lastDoneDate: daysAgoISO(1),
          adjustments: [{ dateLabel: "ayer", by: "coach", text: "Creó la rutina" }],
        }),
      ],
      history: [log(2, alePierna, alePierna.items.length)],
      pastWeeks: [[false, false, true, false, true, false, false]],
      lastSeen: "ayer, 19:30",
    },
    {
      id: "c1",
      name: "María Fernández",
      code: "MARIA",
      plan: "Coaching PRO",
      level: "intermedio",
      sex: "mujer",
      goal: "Tonificar y ganar glúteo",
      sessionsPack: { total: 8, used: 3, nextDay: 2 },
      heightCm: 165,
      weightKg: 62,
      weightHistory: [
        { dateLabel: "hace 1 mes", weightKg: 65 },
        { dateLabel: "hace 3 semanas", weightKg: 64.2 },
        { dateLabel: "hace 2 semanas", weightKg: 63.5 },
        { dateLabel: "hace 1 semana", weightKg: 62.8 },
        { dateLabel: "hace 2 días", weightKg: 62 },
      ],
      week: [true, false, true, true, false, false, false],
      routines: [
        saved("r-maria-1", mariaPierna, ["abductores", "hip-thrust", "prensa"], {
          timesDone: 8,
          lastDoneDate: daysAgoISO(1),
          adjustments: [
            { dateLabel: "hace 3 semanas", by: "coach", text: "Creó la rutina" },
            { dateLabel: "hace 2 semanas", by: "cliente", text: "Pidió subir el peso la próxima sesión" },
            { dateLabel: "hace 2 semanas", by: "coach", text: "Subió Prensa de piernas: 45 kg → 50 kg" },
            { dateLabel: "hace 1 semana", by: "coach", text: "Subió Hip thrust: 30 kg → 35 kg" },
          ],
        }),
        saved("r-maria-2", mariaFull, [], {
          timesDone: 5,
          lastDoneDate: daysAgoISO(4),
          adjustments: [
            { dateLabel: "hace 2 semanas", by: "coach", text: "Creó la rutina" },
          ],
        }),
      ],
      history: [
        { ...log(0, mariaFull, mariaFull.items.length), moreWeight: true, comfortable: true },
        log(2, mariaPierna, 3),
        { ...log(3, mariaFull, mariaFull.items.length - 1), moreWeight: false, comfortable: true },
      ],
      pastWeeks: [
        [true, false, true, false, true, false, false],
        [false, false, true, true, false, true, false],
        [true, false, true, true, false, false, false],
      ],
      lastSeen: "hoy, 9:14",
    },
    {
      id: "c2",
      name: "José Luis Paredes",
      code: "JOSE",
      plan: "Coaching PRO",
      level: "avanzado",
      sex: "hombre",
      goal: "Hipertrofia de torso",
      heightCm: 178,
      weightKg: 82,
      weightHistory: [
        { dateLabel: "hace 1 mes", weightKg: 79 },
        { dateLabel: "hace 2 semanas", weightKg: 80.5 },
        { dateLabel: "hace 4 días", weightKg: 82 },
      ],
      week: [true, true, false, true, true, false, false],
      routines: [
        saved("r-jose-1", josePecho, [
          "press-inclinado-smith",
          "press-pecho",
          "aperturas",
          "fondos-asistidos",
        ], {
          timesDone: 12,
          lastDoneDate: daysAgoISO(3),
          adjustments: [
            { dateLabel: "hace 1 mes", by: "coach", text: "Creó la rutina" },
            { dateLabel: "hace 2 semanas", by: "cliente", text: "Pidió subir el peso la próxima sesión" },
            { dateLabel: "hace 1 semana", by: "coach", text: "Subió Press inclinado: 60 kg → 65 kg" },
          ],
        }),
        saved("r-jose-2", joseEspalda, [], {
          timesDone: 6,
          lastDoneDate: daysAgoISO(6),
          adjustments: [{ dateLabel: "hace 3 semanas", by: "coach", text: "Creó la rutina" }],
        }),
      ],
      history: [
        log(0, josePecho, josePecho.items.length),
        log(1, joseEspalda, joseEspalda.items.length),
        log(3, joseEspalda, 4),
        log(4, josePecho, josePecho.items.length),
      ],
      pastWeeks: [
        [true, true, false, true, true, false, false],
        [true, true, false, true, false, false, false],
        [true, true, true, true, true, false, false],
      ],
      lastSeen: "ayer, 19:40",
    },
    {
      id: "c3",
      name: "Andrea Soto",
      code: "ANDREA",
      plan: "Mensual",
      level: "principiante",
      sex: "mujer",
      goal: "Volver a moverse, salud general",
      heightCm: 160,
      weightKg: 70,
      weightHistory: [{ dateLabel: "hace 1 semana", weightKg: 70 }],
      week: [false, true, false, false, false, false, false],
      routines: [
        saved("r-andrea-1", andreaFull, ["prensa"], {
          timesDone: 2,
          lastDoneDate: daysAgoISO(3),
          adjustments: [{ dateLabel: "hace 1 semana", by: "coach", text: "Creó la rutina" }],
        }),
      ],
      history: [log(1, andreaFull, 1)],
      pastWeeks: [
        [false, false, false, false, false, false, false],
        [false, true, false, false, false, false, false],
        [false, true, false, true, false, false, false],
      ],
      lastSeen: "hace 3 días",
    },
    {
      id: "c4",
      name: "Ricardo Gómez",
      code: "RICARDO",
      plan: "Coaching PRO",
      level: "intermedio",
      sex: "hombre",
      goal: "Espalda fuerte, corregir postura",
      heightCm: 172,
      weightKg: 75,
      weightHistory: [
        { dateLabel: "hace 1 mes", weightKg: 77 },
        { dateLabel: "hace 1 semana", weightKg: 75 },
      ],
      week: [true, true, true, false, false, false, false],
      routines: [
        saved("r-ricardo-1", ricardoEspalda, ["jalon-pecho", "remo-sentado", "remo-maquina"], {
          timesDone: 10,
          lastDoneDate: daysAgoISO(1),
          adjustments: [
            { dateLabel: "hace 1 mes", by: "coach", text: "Creó la rutina" },
            { dateLabel: "hace 4 días", by: "coach", text: "Subió Remo en máquina: 40 kg → 45 kg" },
          ],
        }),
      ],
      history: [
        log(0, ricardoEspalda, ricardoEspalda.items.length),
        log(1, ricardoEspalda, ricardoEspalda.items.length),
        log(2, ricardoEspalda, 3),
      ],
      pastWeeks: [
        [true, false, true, false, false, false, false],
        [true, true, false, true, false, false, false],
        [true, true, true, false, false, false, false],
      ],
      lastSeen: "hoy, 7:02",
    },
  ];
}

function isBrowser(): boolean {
  return typeof window !== "undefined";
}

// Si empezó una semana nueva, la anterior pasa al historial y se limpia
function rotateWeek(client: StoredClient): StoredClient {
  const monday = mondayISO();
  if (!client.weekStartDate) {
    // Datos sin marca de semana (semillas viejas): se marca sin rotar
    return { ...client, weekStartDate: monday };
  }
  if (client.weekStartDate === monday) return client;
  return {
    ...client,
    pastWeeks: [...client.pastWeeks, client.week],
    week: [false, false, false, false, false, false, false],
    history: [],
    weekStartDate: monday,
  };
}

export function loadClients(): StoredClient[] {
  if (!isBrowser()) return seedClients();
  try {
    const raw = window.localStorage.getItem(CLIENTS_KEY);
    if (raw) {
      const parsed = JSON.parse(raw) as StoredClient[];
      // Datos de una versión anterior (sin routines): se re-siembra
      if (parsed.every((client) => Array.isArray(client.routines) && Array.isArray(client.weightHistory))) {
        const rotated = parsed.map(rotateWeek);
        if (JSON.stringify(rotated) !== raw) {
          window.localStorage.setItem(CLIENTS_KEY, JSON.stringify(rotated));
        }
        return rotated;
      }
    }
  } catch {
    // datos corruptos: se re-siembra
  }
  const seeded = seedClients().map((client) => ({
    ...client,
    weekStartDate: mondayISO(),
  }));
  window.localStorage.setItem(CLIENTS_KEY, JSON.stringify(seeded));
  return seeded;
}

export function saveClients(clients: StoredClient[]): void {
  if (!isBrowser()) return;
  window.localStorage.setItem(CLIENTS_KEY, JSON.stringify(clients));
}

export function getSession(): Session {
  if (!isBrowser()) return null;
  try {
    const raw = window.localStorage.getItem(SESSION_KEY);
    return raw ? (JSON.parse(raw) as Session) : null;
  } catch {
    return null;
  }
}

export function setSession(session: Session): void {
  if (!isBrowser()) return;
  if (session === null) {
    window.localStorage.removeItem(SESSION_KEY);
  } else {
    window.localStorage.setItem(SESSION_KEY, JSON.stringify(session));
  }
}

// Horario del coach: qué días trabaja y si está en pausa (avisa a los clientes)
export interface CoachSettings {
  workDays: boolean[]; // L a D
  paused: boolean;
  pauseMessage: string;
}

const DEFAULT_COACH: CoachSettings = {
  // Lunes, miércoles y viernes
  workDays: [true, false, true, false, true, false, false],
  paused: false,
  pauseMessage: "",
};

export function getCoachSettings(): CoachSettings {
  if (!isBrowser()) return DEFAULT_COACH;
  try {
    const raw = window.localStorage.getItem(COACH_KEY);
    if (raw) return JSON.parse(raw) as CoachSettings;
  } catch {
    // corrupto: valores por defecto
  }
  return DEFAULT_COACH;
}

export function saveCoachSettings(settings: CoachSettings): void {
  if (!isBrowser()) return;
  window.localStorage.setItem(COACH_KEY, JSON.stringify(settings));
}

// Login por código: devuelve la sesión creada o null si el código no existe
export function loginWithCode(rawCode: string): Session {
  const code = rawCode.trim().toUpperCase();
  if (!code) return null;
  if (code === COACH_CODE) {
    const session: Session = { type: "coach" };
    setSession(session);
    return session;
  }
  const clients = loadClients();
  const client = clients.find((c) => c.code === code);
  if (!client) return null;
  const session: Session = { type: "client", clientId: client.id };
  setSession(session);
  // Marca la visita
  saveClients(
    clients.map((c) => (c.id === client.id ? { ...c, lastSeen: "hoy" } : c))
  );
  return session;
}

export function logout(): void {
  setSession(null);
}

// Fecha de hoy en formato AAAA-MM-DD (para saber si cambió el día)
export function todayISO(): string {
  return localISO(new Date());
}

// Índice del día actual en la semana L-D (lunes = 0)
export function todayIndex(): number {
  const day = new Date().getDay(); // 0 = domingo
  return day === 0 ? 6 : day - 1;
}

// Muestra fechas guardadas: si es AAAA-MM-DD la vuelve relativa ("ayer");
// si es una etiqueta antigua ("hace 2 semanas"), la deja tal cual
export function formatDateLabel(label: string): string {
  return /^\d{4}-\d{2}-\d{2}$/.test(label) ? lastDoneLabel(label) : label;
}

// Progreso agregado del cliente: ejercicios hechos / totales, en todas sus rutinas
export function clientProgress(client: StoredClient): { completed: number; total: number } {
  return client.routines.reduce(
    (acc, savedRoutine) => ({
      completed:
        acc.completed +
        savedRoutine.routine.items.filter((item) =>
          savedRoutine.done.includes(item.exercise.id)
        ).length,
      total: acc.total + savedRoutine.routine.items.length,
    }),
    { completed: 0, total: 0 }
  );
}

// La rutina que "toca" hoy: la del día actual, o la primera si ninguna calza
export function routineForToday(client: StoredClient): SavedRoutine | null {
  if (client.routines.length === 0) return null;
  return (
    client.routines.find((saved) => saved.routine.day === todayIndex()) ??
    client.routines[0] ??
    null
  );
}

// Genera un código único a partir del nombre (p. ej. "LUCÍA" → "LUCIA2" si choca)
export function generateCode(name: string, existing: StoredClient[]): string {
  const base =
    name
      .trim()
      .split(" ")[0]
      ?.toUpperCase()
      .normalize("NFD")
      .replace(/[\u0300-\u036f]/g, "")
      .replace(/[^A-Z]/g, "")
      .slice(0, 8) || "CLIENTE";
  const taken = new Set(existing.map((c) => c.code));
  if (base !== COACH_CODE && !taken.has(base)) return base;
  let counter = 2;
  while (taken.has(`${base}${counter}`) || `${base}${counter}` === COACH_CODE) {
    counter += 1;
  }
  return `${base}${counter}`;
}

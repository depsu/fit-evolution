// Motor de rutinas express: datos de máquinas del gimnasio y generador
// según las 3 respuestas del asistente (zona, nivel, sexo).

export type MuscleGroup = "pierna" | "pecho-brazos" | "espalda" | "full-body";
export type Level = "principiante" | "intermedio" | "avanzado";
export type Sex = "hombre" | "mujer";

export interface Exercise {
  id: string;
  name: string;
  machine: string;
  // De qué depende: máquina del gimnasio, peso libre o el propio cuerpo
  equipment: "maquina" | "pesas" | "cuerpo";
  // Categoría en el idioma del coach: agarre, empuje, pierna, abdomen, cardio
  movement: "empuje" | "agarre" | "pierna" | "abdomen" | "cardio";
  muscle: string;
  group: MuscleGroup[];
  // 1 = apta principiante, 2 = intermedio, 3 = avanzado
  difficulty: 1 | 2 | 3;
  tip: string;
  // Prioridad extra según sexo (para ordenar, no para excluir)
  emphasis?: Sex;
}

export interface RoutineItem {
  exercise: Exercise;
  sets: number;
  reps: string;
  restSeconds: number;
  // Peso sugerido por el coach (texto libre: "20 kg", "barra sola"…)
  weight?: string;
}

export interface Routine {
  title: string;
  subtitle: string;
  durationMinutes: number;
  items: RoutineItem[];
  // Día asignado: 0 = lunes … 6 = domingo, null = libre
  day?: number | null;
  // Hora planificada para ir al gym (HH:MM), para los recordatorios
  time?: string | null;
}

// Icono según la zona que trabaja la rutina (para la asistencia)
export function iconForRoutine(title: string): string {
  const t = title.toLowerCase();
  if (/(pierna|gl[uú]teo)/.test(t)) return "🦵";
  if (/(agarre|espalda)/.test(t)) return "🏋️";
  if (/(empuje|pecho|brazo)/.test(t)) return "💪";
  if (/abdomen/.test(t)) return "⚡";
  if (/(completo|full)/.test(t)) return "🔥";
  if (/cardio/.test(t)) return "🏃";
  return "🏃";
}

// Categorías en el idioma del coach, para filtrar el catálogo
export const MOVEMENT_OPTIONS: { value: Exercise["movement"]; label: string }[] = [
  { value: "pierna", label: "Pierna" },
  { value: "empuje", label: "Empuje" },
  { value: "agarre", label: "Agarre" },
  { value: "abdomen", label: "Abdomen" },
  { value: "cardio", label: "Cardio" },
];

// El ejercicio de cardio (para los bloques de inicio y cierre)
export function cardioExercise(): Exercise {
  return EXERCISES.find((exercise) => exercise.id === "cardio")!;
}

export const DAY_NAMES = [
  "Lunes",
  "Martes",
  "Miércoles",
  "Jueves",
  "Viernes",
  "Sábado",
  "Domingo",
];

// Catálogo de máquinas/ejercicios del gimnasio.
// Las fotos reales de cada máquina se agregan después (campo machine = nombre visible).
export const EXERCISES: Exercise[] = [
  // ---- PIERNA ----
  {
    id: "prensa",
    movement: "pierna",
    name: "Prensa de piernas",
    machine: "Prensa 45°",
    equipment: "maquina",
    muscle: "Cuádriceps y glúteo",
    group: ["pierna", "full-body"],
    difficulty: 1,
    tip: "Baja controlado hasta 90° y empuja con el talón.",
  },
  {
    id: "extension-cuadriceps",
    movement: "pierna",
    name: "Extensión de cuádriceps",
    machine: "Máquina de extensión",
    equipment: "maquina",
    muscle: "Cuádriceps",
    group: ["pierna"],
    difficulty: 1,
    tip: "Sube en 1 segundo, baja en 3. Sin balancear el cuerpo.",
  },
  {
    id: "curl-femoral",
    movement: "pierna",
    name: "Curl femoral acostado",
    machine: "Máquina femoral",
    equipment: "maquina",
    muscle: "Isquiotibiales",
    group: ["pierna"],
    difficulty: 1,
    tip: "Cadera pegada al banco durante todo el movimiento.",
  },
  {
    id: "hip-thrust",
    movement: "pierna",
    name: "Hip thrust en máquina",
    machine: "Máquina de glúteo",
    equipment: "maquina",
    muscle: "Glúteo mayor",
    group: ["pierna"],
    difficulty: 2,
    tip: "Aprieta el glúteo 1 segundo arriba en cada repetición.",
    emphasis: "mujer",
  },
  {
    id: "abductores",
    movement: "pierna",
    name: "Abductores en máquina",
    machine: "Máquina de abductores",
    equipment: "maquina",
    muscle: "Glúteo medio",
    group: ["pierna"],
    difficulty: 1,
    tip: "Tronco ligeramente inclinado hacia adelante activa más glúteo.",
    emphasis: "mujer",
  },
  {
    id: "sentadilla-smith",
    movement: "pierna",
    name: "Sentadilla en Smith",
    machine: "Máquina Smith",
    equipment: "maquina",
    muscle: "Pierna completa",
    group: ["pierna", "full-body"],
    difficulty: 3,
    tip: "Pies un paso adelante de la barra, espalda firme.",
  },
  {
    id: "gemelos",
    movement: "pierna",
    name: "Elevación de gemelos",
    machine: "Máquina de gemelos",
    equipment: "maquina",
    muscle: "Pantorrilla",
    group: ["pierna"],
    difficulty: 1,
    tip: "Pausa de 2 segundos arriba, estira bien abajo.",
  },
  // ---- PECHO Y BRAZOS ----
  {
    id: "press-pecho",
    movement: "empuje",
    name: "Press de pecho sentado",
    machine: "Máquina press de pecho",
    equipment: "maquina",
    muscle: "Pectoral",
    group: ["pecho-brazos", "full-body"],
    difficulty: 1,
    tip: "Hombros atrás y abajo, no bloquees los codos.",
  },
  {
    id: "aperturas",
    movement: "empuje",
    name: "Aperturas (peck deck)",
    machine: "Peck deck",
    equipment: "maquina",
    muscle: "Pectoral",
    group: ["pecho-brazos"],
    difficulty: 1,
    tip: "Imagina abrazar un árbol: codos siempre semiflexionados.",
  },
  {
    id: "press-inclinado-smith",
    movement: "empuje",
    name: "Press inclinado en Smith",
    machine: "Máquina Smith",
    equipment: "maquina",
    muscle: "Pectoral superior",
    group: ["pecho-brazos"],
    difficulty: 3,
    tip: "La barra baja a la parte alta del pecho.",
    emphasis: "hombre",
  },
  {
    id: "curl-biceps-polea",
    movement: "agarre",
    name: "Curl de bíceps en polea",
    machine: "Polea baja",
    equipment: "maquina",
    muscle: "Bíceps",
    group: ["pecho-brazos"],
    difficulty: 1,
    tip: "Codos pegados al cuerpo, sin balanceo.",
  },
  {
    id: "extension-triceps",
    movement: "empuje",
    name: "Extensión de tríceps en polea",
    machine: "Polea alta",
    equipment: "maquina",
    muscle: "Tríceps",
    group: ["pecho-brazos"],
    difficulty: 1,
    tip: "Solo se mueve el antebrazo; el codo queda fijo.",
  },
  {
    id: "fondos-asistidos",
    movement: "empuje",
    name: "Fondos asistidos",
    machine: "Máquina de fondos asistidos",
    equipment: "maquina",
    muscle: "Pecho y tríceps",
    group: ["pecho-brazos"],
    difficulty: 2,
    tip: "A más contrapeso, más fácil. Baja hasta 90° de codo.",
  },
  // ---- ESPALDA ----
  {
    id: "jalon-pecho",
    movement: "agarre",
    name: "Jalón al pecho",
    machine: "Polea alta (jalón)",
    equipment: "maquina",
    muscle: "Dorsal",
    group: ["espalda", "full-body"],
    difficulty: 1,
    tip: "Lleva la barra a la clavícula, pecho arriba.",
  },
  {
    id: "remo-sentado",
    movement: "agarre",
    name: "Remo sentado en polea",
    machine: "Polea de remo",
    equipment: "maquina",
    muscle: "Espalda media",
    group: ["espalda", "full-body"],
    difficulty: 1,
    tip: "Saca pecho y lleva los codos hacia atrás, no los hombros.",
  },
  {
    id: "remo-maquina",
    movement: "agarre",
    name: "Remo en máquina de palanca",
    machine: "Máquina de remo",
    equipment: "maquina",
    muscle: "Dorsal y romboides",
    group: ["espalda"],
    difficulty: 2,
    tip: "Pecho apoyado en el soporte todo el tiempo.",
  },
  {
    id: "dominadas-asistidas",
    movement: "agarre",
    name: "Dominadas asistidas",
    machine: "Máquina de dominadas asistidas",
    equipment: "maquina",
    muscle: "Dorsal y bíceps",
    group: ["espalda"],
    difficulty: 3,
    tip: "Sube hasta que la barbilla pase la barra.",
    emphasis: "hombre",
  },
  {
    id: "hiperextensiones",
    movement: "pierna",
    name: "Hiperextensiones",
    machine: "Banco romano",
    equipment: "maquina",
    muscle: "Lumbar y glúteo",
    group: ["espalda", "pierna"],
    difficulty: 1,
    tip: "Sube solo hasta alinear el cuerpo, sin arquear de más.",
  },
  // ---- PESO LIBRE (mancuernas y barra) ----
  {
    id: "sentadilla-goblet",
    movement: "pierna",
    name: "Sentadilla goblet",
    machine: "Mancuerna",
    equipment: "pesas",
    muscle: "Pierna completa",
    group: ["pierna", "full-body"],
    difficulty: 1,
    tip: "Sujeta la mancuerna al pecho, baja con la espalda recta.",
  },
  {
    id: "peso-muerto-rumano",
    movement: "pierna",
    name: "Peso muerto rumano",
    machine: "Mancuernas",
    equipment: "pesas",
    muscle: "Isquiotibiales y glúteo",
    group: ["pierna"],
    difficulty: 2,
    tip: "Baja las mancuernas pegadas a las piernas, cadera hacia atrás.",
    emphasis: "mujer",
  },
  {
    id: "zancadas",
    movement: "pierna",
    name: "Zancadas con mancuernas",
    machine: "Mancuernas",
    equipment: "pesas",
    muscle: "Cuádriceps y glúteo",
    group: ["pierna"],
    difficulty: 2,
    tip: "Paso largo y rodilla de atrás casi al suelo.",
  },
  {
    id: "press-banca-mancuernas",
    movement: "empuje",
    name: "Press de banca con mancuernas",
    machine: "Mancuernas y banco",
    equipment: "pesas",
    muscle: "Pectoral",
    group: ["pecho-brazos", "full-body"],
    difficulty: 2,
    tip: "Baja las mancuernas a la altura del pecho, codos a 45°.",
    emphasis: "hombre",
  },
  {
    id: "press-militar",
    movement: "empuje",
    name: "Press militar con mancuernas",
    machine: "Mancuernas",
    equipment: "pesas",
    muscle: "Hombros",
    group: ["pecho-brazos"],
    difficulty: 2,
    tip: "Abdomen firme; no arquees la espalda al empujar.",
  },
  {
    id: "curl-mancuernas",
    movement: "agarre",
    name: "Curl de bíceps con mancuernas",
    machine: "Mancuernas",
    equipment: "pesas",
    muscle: "Bíceps",
    group: ["pecho-brazos"],
    difficulty: 1,
    tip: "Alterna los brazos y controla la bajada.",
  },
  {
    id: "remo-mancuerna",
    movement: "agarre",
    name: "Remo con mancuerna a un brazo",
    machine: "Mancuerna y banco",
    equipment: "pesas",
    muscle: "Dorsal",
    group: ["espalda"],
    difficulty: 1,
    tip: "Apoya rodilla y mano en el banco; lleva el codo hacia la cadera.",
  },
  // ---- ABDOMEN ----
  {
    id: "crunch-maquina",
    movement: "abdomen",
    name: "Crunch en máquina",
    machine: "Máquina de abdominales",
    equipment: "maquina",
    muscle: "Abdomen",
    group: ["full-body"],
    difficulty: 1,
    tip: "Exhala al subir y no tires del cuello.",
  },
  {
    id: "plancha",
    movement: "abdomen",
    name: "Plancha",
    machine: "Colchoneta",
    equipment: "cuerpo",
    muscle: "Abdomen y core",
    group: ["full-body"],
    difficulty: 1,
    tip: "Cuerpo en línea recta, aprieta abdomen y glúteo.",
  },
  {
    id: "elevacion-piernas",
    movement: "abdomen",
    name: "Elevación de piernas",
    machine: "Espaldera o banco",
    equipment: "cuerpo",
    muscle: "Abdomen bajo",
    group: ["full-body"],
    difficulty: 2,
    tip: "Sube las piernas controlado, sin balancearte.",
  },
  // ---- CARDIO ----
  {
    id: "cardio",
    movement: "cardio",
    name: "Cardio (cinta, bici o elíptica)",
    machine: "Zona cardio",
    equipment: "maquina",
    muscle: "Resistencia",
    group: ["full-body"],
    difficulty: 1,
    tip: "Ritmo cómodo: deberías poder hablar mientras lo haces.",
  },
  {
    id: "peso-muerto-barra",
    movement: "agarre",
    name: "Peso muerto con barra",
    machine: "Barra olímpica",
    equipment: "pesas",
    muscle: "Espalda baja y pierna",
    group: ["espalda", "pierna", "full-body"],
    difficulty: 3,
    tip: "Barra pegada al cuerpo y espalda neutra todo el recorrido.",
    emphasis: "hombre",
  },
];

export const LEVEL_CONFIG: Record<
  Level,
  { count: number; sets: number; reps: string; rest: number; maxDifficulty: 1 | 2 | 3 }
> = {
  principiante: { count: 4, sets: 3, reps: "12-15", rest: 90, maxDifficulty: 1 },
  intermedio: { count: 5, sets: 4, reps: "10-12", rest: 75, maxDifficulty: 2 },
  avanzado: { count: 6, sets: 4, reps: "8-10", rest: 60, maxDifficulty: 3 },
};

const GROUP_LABEL: Record<MuscleGroup, string> = {
  pierna: "Pierna y glúteo",
  "pecho-brazos": "Pecho y brazos",
  espalda: "Espalda",
  "full-body": "Cuerpo completo",
};

export function buildRoutine(group: MuscleGroup, level: Level, sex: Sex): Routine {
  const config = LEVEL_CONFIG[level];

  const pool = EXERCISES.filter(
    (exercise) =>
      exercise.group.includes(group) && exercise.difficulty <= config.maxDifficulty
  );

  // Prioriza ejercicios con énfasis para el sexo elegido y luego los más accesibles
  const sorted = [...pool].sort((a, b) => {
    const emphasisA = a.emphasis === sex ? -1 : 0;
    const emphasisB = b.emphasis === sex ? -1 : 0;
    if (emphasisA !== emphasisB) return emphasisA - emphasisB;
    return a.difficulty - b.difficulty;
  });

  const chosen = sorted.slice(0, config.count);

  const items: RoutineItem[] = chosen.map((exercise) => ({
    exercise,
    sets: config.sets,
    reps: config.reps,
    restSeconds: config.rest,
  }));

  const totalMinutes = Math.round(
    items.reduce(
      (minutes, item) => minutes + item.sets * (0.75 + item.restSeconds / 60),
      8 // calentamiento
    )
  );

  return {
    title: `Rutina express · ${GROUP_LABEL[group]}`,
    subtitle: `Nivel ${level} · ${items.length} ejercicios · descansos de ${config.rest}s`,
    durationMinutes: totalMinutes,
    items,
  };
}

export const GROUP_OPTIONS: { value: MuscleGroup; label: string; detail: string }[] = [
  { value: "pierna", label: "Pierna y glúteo", detail: "Prensa, femoral, hip thrust…" },
  { value: "pecho-brazos", label: "Pecho y brazos", detail: "Press, poleas, fondos…" },
  { value: "espalda", label: "Espalda", detail: "Jalón, remo, dominadas…" },
  { value: "full-body", label: "Cuerpo completo", detail: "Un poco de todo, ideal si vienes 2-3 días" },
];

export const LEVEL_OPTIONS: { value: Level; label: string; detail: string }[] = [
  { value: "principiante", label: "Principiante", detail: "Primeras semanas en el gym" },
  { value: "intermedio", label: "Intermedio", detail: "Ya entrenas hace unos meses" },
  { value: "avanzado", label: "Avanzado", detail: "Entrenas fuerte hace más de un año" },
];

export const SEX_OPTIONS: { value: Sex; label: string; detail: string }[] = [
  { value: "mujer", label: "Mujer", detail: "Énfasis en glúteo y tren inferior" },
  { value: "hombre", label: "Hombre", detail: "Énfasis en torso y fuerza" },
];

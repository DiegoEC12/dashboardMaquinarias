export interface Indicator {
  id: string;
  nombre: string;
  peso: number;
  orden: number;
}

export interface Question {
  id: string;
  idIndicador: string;
  pregunta: string;
  tipoRespuesta: string;
}

export interface Evaluation {
  id: string;
  periodo: string;
  concesionaria: string;
  marca: string;
  ubicacion: string;
  tipoEmpresa: string; // 'MAQUINARIAS' | 'COMPETENCIA'
}

export interface IndicatorResult {
  idEvaluacion: string;
  idIndicador: string;
  resultado: number | null;
  peso: number;
}

export interface QuestionResponse {
  idEvaluacion: string;
  idPregunta: string;
  puntaje: number | null;
  comentario: string | null;
  respuesta: string | null;
}

export interface Dataset {
  meta: Record<string, unknown>;
  indicators: Indicator[];
  questions: Question[];
  evaluations: Evaluation[];
  indicatorResults: IndicatorResult[];
  questionResponses: QuestionResponse[];
}

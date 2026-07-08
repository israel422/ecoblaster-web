import { openDB, type DBSchema, type IDBPDatabase } from "idb";
import type { FotoItem } from "@/types";

export interface TurnoRegistro {
  id?: number;
  serverId?: string; // id do turnos_abertos no servidor, depois de registrado lá
  cpf: string;
  operador: string;
  obra: string;
  data: string; // yyyy-mm-dd
  tipoCava: string;
  totalCavas: string;
  observacao: string;
  fotos: FotoItem[];
  criadoEm: string;
  atualizadoEm: string;
}

interface EcoBlasterDB extends DBSchema {
  turnos: {
    key: number;
    value: TurnoRegistro;
    indexes: { "by-cpf": string };
  };
}

let dbPromise: Promise<IDBPDatabase<EcoBlasterDB>> | null = null;

function abrirDB() {
  if (!dbPromise) {
    dbPromise = openDB<EcoBlasterDB>("EcoBlasterDB", 1, {
      upgrade(db) {
        const store = db.createObjectStore("turnos", { keyPath: "id", autoIncrement: true });
        store.createIndex("by-cpf", "cpf");
      },
    });
  }
  return dbPromise;
}

export async function salvarTurno(turno: TurnoRegistro): Promise<number> {
  const db = await abrirDB();
  turno.atualizadoEm = new Date().toISOString();
  const id = await db.put("turnos", turno);
  return id as number;
}

export async function listarTurnosPorCpf(cpf: string): Promise<TurnoRegistro[]> {
  const db = await abrirDB();
  return db.getAllFromIndex("turnos", "by-cpf", cpf);
}

export async function listarTodosTurnos(): Promise<TurnoRegistro[]> {
  const db = await abrirDB();
  return db.getAll("turnos");
}

export async function carregarTurnoPorId(id: number): Promise<TurnoRegistro | undefined> {
  const db = await abrirDB();
  return db.get("turnos", id);
}

export async function apagarTurno(id: number): Promise<void> {
  const db = await abrirDB();
  await db.delete("turnos", id);
}

export function turnoCompleto(turno: Pick<TurnoRegistro, "fotos">): boolean {
  return turno.fotos.length > 0 && turno.fotos.every((f) => !!f.blob);
}

export function fotosFeitas(turno: Pick<TurnoRegistro, "fotos">): number {
  return turno.fotos.filter((f) => !!f.blob).length;
}

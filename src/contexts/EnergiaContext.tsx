import { createContext, useContext, useState, ReactNode, useEffect } from "react";

type Indicador = {
  id: string;
  nome: string;
  cpf: string;
  data_nascimento: string;
  pontos_acumulados: number;
  etapa_atual: string | null;
  codigo_link: string;
  telefone?: string;
  email?: string;
};

type Ctx = {
  indicador: Indicador | null;
  setIndicador: (i: Indicador | null) => void;
  cpf: string;
  setCpf: (s: string) => void;
};

const EnergiaCtx = createContext<Ctx>({} as Ctx);

export function EnergiaProvider({ children }: { children: ReactNode }) {
  const [indicador, setIndicadorState] = useState<Indicador | null>(() => {
    const s = sessionStorage.getItem("ev_indicador");
    return s ? JSON.parse(s) : null;
  });
  const [cpf, setCpfState] = useState<string>(() => sessionStorage.getItem("ev_cpf") || "");

  const setIndicador = (i: Indicador | null) => {
    setIndicadorState(i);
    if (i) sessionStorage.setItem("ev_indicador", JSON.stringify(i));
    else sessionStorage.removeItem("ev_indicador");
  };
  const setCpf = (s: string) => {
    setCpfState(s);
    if (s) sessionStorage.setItem("ev_cpf", s);
    else sessionStorage.removeItem("ev_cpf");
  };

  return <EnergiaCtx.Provider value={{ indicador, setIndicador, cpf, setCpf }}>{children}</EnergiaCtx.Provider>;
}

export const useEnergia = () => useContext(EnergiaCtx);
export type { Indicador };

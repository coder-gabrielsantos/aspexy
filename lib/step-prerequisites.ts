import type { SchoolClass, StructureSummary, Subject, TabMode, Teacher } from "@/lib/types";

export function computeCanOpenGenerate(
  structures: StructureSummary[],
  classes: SchoolClass[],
  teachers: Teacher[],
  subjects: Subject[]
): boolean {
  if (structures.length === 0 || classes.length === 0 || teachers.length === 0 || subjects.length === 0) {
    return false;
  }
  const tIds = new Set(teachers.map((t) => t.id));
  const cIds = new Set(classes.map((c) => c.id));
  return subjects.every(
    (s) =>
      s.teacher_ids.length > 0 &&
      Boolean(s.class_id) &&
      s.teacher_ids.every((tid) => tIds.has(tid)) &&
      cIds.has(s.class_id)
  );
}

export type StepPrerequisiteGuideModel = {
  title: string;
  lead: string;
  bullets: string[];
  actions: { tab: TabMode; label: string }[];
};

type Ctx = {
  structures: StructureSummary[];
  classes: SchoolClass[];
  teachers: Teacher[];
  subjects: Subject[];
};

/** Se a aba `tab` pode ser usada; caso contrário devolve texto de orientação e atalhos. */
export function getTabPrerequisiteGuide(tab: TabMode, ctx: Ctx): StepPrerequisiteGuideModel | null {
  const { structures, classes, teachers, subjects } = ctx;
  const canGenerate = computeCanOpenGenerate(structures, classes, teachers, subjects);

  if (tab === "grade") return null;

  if (tab === "classes") {
    if (structures.length > 0) return null;
    return {
      title: "Comece pela estrutura de horário",
      lead: "Antes de cadastrar turmas, é preciso ter pelo menos uma estrutura salva.",
      bullets: ["Na aba Estrutura, defina os horários e clique em salvar."],
      actions: [{ tab: "grade", label: "Ir para Estrutura" }]
    };
  }

  if (tab === "teachers") {
    if (structures.length === 0) {
      return {
        title: "Comece pela estrutura de horário",
        lead: "A disponibilidade dos professores usa a mesma grade (dias e slots) da estrutura salva. Crie uma estrutura antes de cadastrar professores.",
        bullets: ["Na aba Estrutura, defina os horários e clique em salvar."],
        actions: [{ tab: "grade", label: "Ir para Estrutura" }]
      };
    }
    if (classes.length > 0) return null;
    return {
      title: "Cadastre turmas primeiro",
      lead: "As turmas aparecem nas disciplinas e na geração de horários; sem turmas o próximo passo é criá-las.",
      bullets: ["Depois você poderá vincular professores e disciplinas a cada turma."],
      actions: [{ tab: "classes", label: "Ir para Turmas" }]
    };
  }

  if (tab === "subjects") {
    if (teachers.length > 0) return null;
    return {
      title: "Cadastre professores antes",
      lead: "Cada disciplina precisa de pelo menos um professor já cadastrado.",
      bullets: ["Na aba Professores, adicione os docentes; depois volte aqui para criar as disciplinas."],
      actions: [{ tab: "teachers", label: "Ir para Professores" }]
    };
  }

  if (tab === "constraints") {
    if (teachers.length >= 1) return null;
    return {
      title: "Cadastre professores antes",
      lead: "As regras de exclusão de horário envolvem professores do cadastro.",
      bullets: ["Adicione ao menos um professor na aba Professores."],
      actions: [{ tab: "teachers", label: "Ir para Professores" }]
    };
  }

  if (tab === "generate") {
    if (canGenerate) return null;

    if (structures.length === 0) {
      return {
        title: "Defina a estrutura da escola",
        lead: "O gerador usa a grade base (dias e intervalos) que você salva em Estrutura.",
        bullets: [],
        actions: [{ tab: "grade", label: "Ir para Estrutura" }]
      };
    }
    if (classes.length === 0) {
      return {
        title: "Inclua ao menos uma turma",
        lead: "O horário é montado por turma; cadastre turmas para continuar.",
        bullets: [],
        actions: [{ tab: "classes", label: "Ir para Turmas" }]
      };
    }
    if (teachers.length === 0) {
      return {
        title: "Adicione professores",
        lead: "Sem professores não há como distribuir aulas nas células.",
        bullets: [],
        actions: [{ tab: "teachers", label: "Ir para Professores" }]
      };
    }
    if (subjects.length === 0) {
      return {
        title: "Cadastre disciplinas",
        lead: "O solver precisa saber quais matérias existem, quantas aulas por semana e em qual turma.",
        bullets: [],
        actions: [{ tab: "subjects", label: "Ir para Disciplinas" }]
      };
    }

    return {
      title: "Ajuste as disciplinas",
      lead: "Todas as disciplinas precisam ter pelo menos um professor, turma válida e professores que existam no cadastro.",
      bullets: [
        "Abra cada disciplina e confira professores e turma.",
        "Remova professores apagados ou troque a turma se ela não existir mais."
      ],
      actions: [{ tab: "subjects", label: "Ir para Disciplinas" }]
    };
  }

  return null;
}

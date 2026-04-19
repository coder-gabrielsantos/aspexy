"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import { signOut, useSession } from "next-auth/react";
import { BookOpen, GraduationCap, LayoutGrid, Link2, Users, WandSparkles } from "lucide-react";

import AppSidebar from "@/components/app-sidebar";
import ConfirmDialog from "@/components/confirm-dialog";
import StepPrerequisiteGuide from "@/components/step-prerequisite-guide";
import ToastStack from "@/components/toast-stack";
import { SkeletonPanel, SkeletonTable } from "@/components/ui/skeleton";
import { getTabPrerequisiteGuide } from "@/lib/step-prerequisites";
import type { StepDef, TabMode } from "@/lib/types";

import StructureTab from "@/components/tabs/structure-tab";
import ClassesTab from "@/components/tabs/classes-tab";
import TeachersTab from "@/components/tabs/teachers-tab";
import SubjectsTab from "@/components/tabs/subjects-tab";
import GenerateTab from "@/components/tabs/generate-tab";
import ConstraintsTab from "@/components/tabs/constraints-tab";

import { useToasts } from "@/hooks/use-toasts";
import { useStructures } from "@/hooks/use-structures";
import { useClasses } from "@/hooks/use-classes";
import { useTeachers } from "@/hooks/use-teachers";
import { useSubjects } from "@/hooks/use-subjects";
import { useScheduleGeneration } from "@/hooks/use-schedule-generation";
import { useScheduleConstraints } from "@/hooks/use-schedule-constraints";

const STEPS: StepDef[] = [
  { id: "grade", label: "Estrutura", icon: LayoutGrid },
  { id: "classes", label: "Turmas", icon: GraduationCap },
  { id: "teachers", label: "Professores", icon: Users },
  { id: "subjects", label: "Disciplinas", icon: BookOpen },
  { id: "constraints", label: "Regras", icon: Link2 },
  { id: "generate", label: "Horários", icon: WandSparkles }
];

const PAGE_TITLE: Record<TabMode, string> = {
  grade: "Estrutura",
  classes: "Turmas",
  teachers: "Professores",
  subjects: "Disciplinas",
  constraints: "Regras de geração",
  generate: "Horários"
};

export default function AspexyCanvas() {
  const [activeTab, setActiveTab] = useState<TabMode>("grade");
  const [sidebarOpen, setSidebarOpen] = useState(false);

  const { toasts, showToast, dismissToast } = useToasts();
  const structuresHook = useStructures(showToast);
  const classesHook = useClasses(showToast);
  const teachersHook = useTeachers(showToast);
  const subjectsHook = useSubjects(showToast);
  const constraintsHook = useScheduleConstraints(showToast);
  const generationHook = useScheduleGeneration(showToast, classesHook.classes);

  const [confirmTarget, setConfirmTarget] = useState<"structure" | "generated" | "teacher" | "class" | "subject" | null>(null);
  const [confirmClassId, setConfirmClassId] = useState("");
  const [confirmSubjectId, setConfirmSubjectId] = useState("");
  const [isDeleting, setIsDeleting] = useState(false);

  useEffect(() => {
    void structuresHook.loadStructures();
    void generationHook.loadGeneratedSchedules();
    void classesHook.loadClasses();
    void teachersHook.loadTeachers();
    void subjectsHook.loadSubjects();
    void constraintsHook.loadConstraints();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const initialLoading =
    structuresHook.isLoading ||
    classesHook.isLoading ||
    teachersHook.isLoading ||
    subjectsHook.isLoading ||
    constraintsHook.isLoading;

  const { structures } = structuresHook;
  const { classes } = classesHook;
  const { teachers } = teachersHook;
  const { subjects } = subjectsHook;

  const tabPrerequisiteGuide = useMemo(
    () => getTabPrerequisiteGuide(activeTab, { structures, classes, teachers, subjects }),
    [activeTab, structures, classes, teachers, subjects]
  );

  const navigateToStep = useCallback((tab: TabMode | string) => {
    setActiveTab(tab as TabMode);
    setSidebarOpen(false);
  }, []);

  const runConfirmDelete = async () => {
    setIsDeleting(true);
    try {
      if (confirmTarget === "structure") await structuresHook.runDeleteStructure();
      else if (confirmTarget === "generated") await generationHook.runDeleteGeneratedSchedule();
      else if (confirmTarget === "teacher") await teachersHook.runDeleteTeacher();
      else if (confirmTarget === "class") await classesHook.runDeleteClass(confirmClassId);
      else if (confirmTarget === "subject") await subjectsHook.runDeleteSubject(confirmSubjectId);
      setConfirmTarget(null);
      setConfirmClassId("");
      setConfirmSubjectId("");
    } catch (e) {
      showToast(e instanceof Error ? e.message : "Falha ao excluir.", "error");
    } finally {
      setIsDeleting(false);
    }
  };

  const { data: session } = useSession();
  const userInitials = (session?.user?.name ?? "U").split(" ").map((w) => w[0]).join("").slice(0, 2).toUpperCase();

  const breadcrumbCurrent = STEPS.find((s) => s.id === activeTab)?.label ?? PAGE_TITLE[activeTab];
  const pageTitle = PAGE_TITLE[activeTab];

  return (
    <div className="flex min-h-screen flex-col bg-white">
      <AppSidebar
        steps={STEPS}
        activeStep={activeTab}
        onStepChange={navigateToStep}
        userName={session?.user?.name}
        userImage={session?.user?.image}
        userInitials={userInitials}
        onSignOut={() => void signOut({ callbackUrl: "/login" })}
        mobileOpen={sidebarOpen}
        onMobileOpenChange={setSidebarOpen}
      />

      <div className="flex min-h-0 min-w-0 flex-1 flex-col lg:ml-[260px]">
        <header className="sticky top-0 z-40 hidden h-[var(--app-header-h)] min-h-[4rem] items-center border-b border-slate-200 bg-white/95 px-6 shadow-[0_1px_0_rgba(15,23,42,0.06),0_4px_12px_-2px_rgba(15,23,42,0.08)] backdrop-blur-sm lg:flex">
          <nav className="flex items-center gap-2 text-sm text-slate-500" aria-label="Localização na aplicação">
            <span className="font-semibold text-indigo-700">Etapas</span>
            <span className="text-indigo-300" aria-hidden>
              ·
            </span>
            <span className="font-medium text-slate-800">{breadcrumbCurrent}</span>
          </nav>
        </header>

        <main className="app-shell-main min-w-0 flex-1 overflow-x-hidden px-4 py-8 sm:px-6 lg:px-10 lg:py-10">
          <header className="mb-8 animate-fade-in">
            <h1 className="text-lg font-semibold tracking-tight text-slate-900 sm:text-xl">{pageTitle}</h1>
          </header>

          {initialLoading && (
            <div className="animate-fade-in space-y-5">
              <SkeletonPanel lines={2} />
              <SkeletonTable rows={4} cols={6} />
            </div>
          )}

          {!initialLoading && activeTab === "grade" && (
            <StructureTab
              structures={structuresHook}
              onRequestDelete={() => setConfirmTarget("structure")}
              onStructureSaved={(id) => generationHook.setDefaultGenerationStructure(id)}
            />
          )}

          {!initialLoading && activeTab === "classes" && (
            tabPrerequisiteGuide ? (
              <StepPrerequisiteGuide {...tabPrerequisiteGuide} onNavigate={navigateToStep} />
            ) : (
              <ClassesTab
                classesHook={classesHook}
                onRequestDelete={(id) => {
                  setConfirmClassId(id);
                  setConfirmTarget("class");
                }}
              />
            )
          )}

          {!initialLoading && activeTab === "teachers" && (
            tabPrerequisiteGuide ? (
              <StepPrerequisiteGuide {...tabPrerequisiteGuide} onNavigate={navigateToStep} />
            ) : (
              <TeachersTab
                teachersHook={teachersHook}
                structureSelectOptions={structuresHook.structureSelectOptions}
                onRequestDelete={() => setConfirmTarget("teacher")}
              />
            )
          )}

          {!initialLoading && activeTab === "subjects" && (
            tabPrerequisiteGuide ? (
              <StepPrerequisiteGuide {...tabPrerequisiteGuide} onNavigate={navigateToStep} />
            ) : (
              <SubjectsTab
                subjectsHook={subjectsHook}
                teacherSelectOptions={teachersHook.teacherSelectOptions}
                classSelectOptions={classesHook.classSelectOptions}
                teacherNameById={teachersHook.teacherNameById}
                classNameById={classesHook.classNameById}
                onRequestDelete={(id) => {
                  setConfirmSubjectId(id);
                  setConfirmTarget("subject");
                }}
              />
            )
          )}

          {!initialLoading && activeTab === "constraints" && (
            tabPrerequisiteGuide ? (
              <StepPrerequisiteGuide {...tabPrerequisiteGuide} onNavigate={navigateToStep} />
            ) : (
              <ConstraintsTab constraintsHook={constraintsHook} teacherSelectOptions={teachersHook.teacherSelectOptions} />
            )
          )}

          {!initialLoading && activeTab === "generate" && (
            tabPrerequisiteGuide ? (
              <StepPrerequisiteGuide {...tabPrerequisiteGuide} onNavigate={navigateToStep} />
            ) : (
              <GenerateTab
                generationHook={generationHook}
                structureSelectOptions={structuresHook.structureSelectOptions}
                onRequestDeleteGenerated={() => setConfirmTarget("generated")}
                teacherSelectOptions={teachersHook.teacherSelectOptions}
                subjects={subjectsHook.subjects}
                classNameById={classesHook.classNameById}
              />
            )
          )}
        </main>
      </div>

      <ToastStack toasts={toasts} onDismiss={dismissToast} />

      <ConfirmDialog
        open={confirmTarget !== null}
        onOpenChange={(open) => {
          if (!open && !isDeleting) setConfirmTarget(null);
        }}
        title={
          confirmTarget === "generated" ? "Excluir horário gerado?"
            : confirmTarget === "teacher" ? "Excluir professor?"
            : confirmTarget === "class" ? "Excluir turma?"
            : confirmTarget === "subject" ? "Excluir disciplina?"
            : "Excluir estrutura?"
        }
        description={
          confirmTarget === "generated" ? "O horário será removido permanentemente do banco. Esta ação não pode ser desfeita."
            : confirmTarget === "teacher" ? "O professor será removido permanentemente. Esta ação não pode ser desfeita."
            : confirmTarget === "class" ? "A turma será removida permanentemente. Esta ação não pode ser desfeita."
            : confirmTarget === "subject" ? "A disciplina será removida permanentemente. Esta ação não pode ser desfeita."
            : "A estrutura será removida permanentemente. Esta ação não pode ser desfeita."
        }
        confirmText="Excluir"
        cancelText="Cancelar"
        variant="danger"
        isPending={isDeleting}
        onConfirm={runConfirmDelete}
      />
    </div>
  );
}

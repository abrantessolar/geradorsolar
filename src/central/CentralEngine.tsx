import { useEffect, useRef, useState } from 'react';
import { CentralSession, OptionDef } from './types';
import { STEPS, START_STEP } from './config/flow';
import { videos, testimonialCases } from './config/videos';
import { loadSession, saveSession, createEmptySession } from './lib/session';
import { calculateScore } from './config/scoring';
import { resolveDestination } from './lib/routing';
import { buildWhatsAppMessage, formatWhatsAppUrl } from './lib/whatsapp';
import { contacts } from './config/contacts';
import { track } from './lib/analytics';

import QuestionScreen from './components/QuestionScreen';
import OptionCard from './components/OptionCard';
import ExcitementScale from './components/ExcitementScale';
import VideoStep from './components/VideoStep';
import TestimonialCase from './components/TestimonialCase';
import FileUpload from './components/FileUpload';
import LeadCapture from './components/LeadCapture';
import ResultScreen from './components/ResultScreen';
import Progress from './components/Progress';
import BackButton from './components/BackButton';
import HelpNowButton from './components/HelpNowButton';

// Profundidade aproximada de cada caminho, só para a barra de progresso.
const ESTIMATED_DEPTH = 7;

const ENTRY_EVENT: Record<string, string> = {
  home_a: 'entry_customer',
  home_b: 'entry_quote',
  home_c: 'entry_external_system',
  home_d: 'entry_supplier',
};

export default function CentralEngine() {
  const [session, setSession] = useState<CentralSession>(() => loadSession());
  const startedTracked = useRef(false);

  useEffect(() => {
    if (!startedTracked.current) {
      track('central_started', { utm_source: session.utm.source, utm_medium: session.utm.medium, utm_campaign: session.utm.campaign });
      startedTracked.current = true;
    }
  }, [session.utm.campaign, session.utm.medium, session.utm.source]);

  useEffect(() => {
    saveSession(session);
  }, [session]);

  const step = STEPS[session.currentStep] ?? STEPS[START_STEP];

  function goto(nextStepId: string, patch: Partial<CentralSession> = {}) {
    setSession((prev) => {
      const merged: CentralSession = {
        ...prev,
        ...patch,
        history: [...prev.history, prev.currentStep],
        currentStep: nextStepId,
      };
      merged.score = calculateScore(merged);
      return merged;
    });
  }

  function handleOption(option: OptionDef) {
    const entryEvent = ENTRY_EVENT[option.id];
    if (entryEvent) track(entryEvent as 'entry_customer');
    if (step.id === 'A' || step.id === 'C' || step.id === 'B') track('need_selected', { stepId: step.id, optionId: option.id });
    if (step.id === 'B_consumo') track('consumption_selected', { optionId: option.id });
    if (step.id === 'B_priority') track('priority_selected', { optionId: option.id });

    const answerPatch = option.answerKey ? { answers: { ...session.answers, [option.answerKey]: option.label } } : {};
    const consumptionPatch = step.id === 'B_consumo' ? { consumptionRange: consumptionKeyFromOption(option.id) } : {};

    goto(option.goto, { ...option.patch, ...answerPatch, ...consumptionPatch });
  }

  function handleScale(value: number) {
    track(`excitement_${value}` as 'excitement_1');
    const next = step.gotoForValue ? step.gotoForValue(value) : 'result';
    goto(next, { excitement: value });
  }

  function handleText(value: string) {
    if (!step.answerKey || !step.next) return;
    goto(step.next, { answers: { ...session.answers, [step.answerKey]: value } });
  }

  function handleFileUpload(fileName: string) {
    if (!step.next) return;
    goto(step.next, { filesAttached: [...session.filesAttached, fileName] });
  }

  function handleSkipUpload() {
    if (!step.next) return;
    goto(step.next);
  }

  function handleVideoContinue() {
    if (!step.next) return;
    goto(step.next, { videosViewed: step.videoKey ? [...session.videosViewed, step.videoKey] : session.videosViewed });
  }

  function handleTestimonialsContinue() {
    if (!step.next) return;
    goto(step.next, { videosViewed: [...session.videosViewed, 'testimonials'] });
  }

  function handleLeadSubmit(lead: CentralSession['lead']) {
    if (!step.next) return;
    goto(step.next, { lead, completed: true });
  }

  function handleBack() {
    setSession((prev) => {
      if (prev.history.length === 0) return prev;
      const history = [...prev.history];
      const previousStep = history.pop()!;
      return { ...prev, history, currentStep: previousStep };
    });
  }

  function handleTalkNow() {
    const comTalkNow: CentralSession = { ...session, talkNow: true };
    track('help_now_clicked', { stepId: step.id });
    track('whatsapp_clicked', { destination: 'general' });
    const mensagem = buildWhatsAppMessage(comTalkNow);
    window.open(formatWhatsAppUrl(contacts.general, mensagem), '_blank');
  }

  const progresso = Math.min(1, (session.history.length + 1) / ESTIMATED_DEPTH);
  const podeVoltar = session.history.length > 0 && step.id !== 'result';

  return (
    <div className="min-h-screen pb-24" style={{ background: '#F5F7FA' }}>
      <div className="max-w-md mx-auto px-5 pt-8">
        {step.id !== 'home' && step.id !== 'result' && <Progress value={progresso} />}
        {podeVoltar && <BackButton onClick={handleBack} />}

        <div key={step.id} className="animate-fade-in-up">
          {renderStep()}
        </div>
      </div>

      {step.id !== 'result' && <HelpNowButton onClick={handleTalkNow} />}
    </div>
  );

  function renderStep() {
    switch (step.kind) {
      case 'choice':
        return (
          <QuestionScreen title={step.title} subtitle={step.subtitle}>
            <div className="space-y-3">
              {step.options?.map((option) => (
                <OptionCard key={option.id} option={option} onSelect={handleOption} />
              ))}
            </div>
          </QuestionScreen>
        );

      case 'scale':
        return (
          <QuestionScreen title={step.title} subtitle={step.subtitle}>
            <ExcitementScale milestones={step.milestones ?? []} onSelect={handleScale} />
          </QuestionScreen>
        );

      case 'text':
        return (
          <QuestionScreen title={step.title}>
            <TextStepBody placeholder={step.placeholder} onSubmit={handleText} />
          </QuestionScreen>
        );

      case 'info':
        return (
          <QuestionScreen title={step.title} subtitle={step.subtitle}>
            <button onClick={() => step.next && goto(step.next)} className="w-full h-12 rounded-xl font-bold" style={{ background: '#F5A623', color: '#1A2233' }}>
              Continuar
            </button>
          </QuestionScreen>
        );

      case 'fileUpload':
        return (
          <QuestionScreen title={step.title}>
            <FileUpload prompt={step.uploadPrompt ?? ''} onDone={handleFileUpload} onSkip={handleSkipUpload} />
          </QuestionScreen>
        );

      case 'video':
        return (
          <QuestionScreen title={step.title}>
            <VideoStep video={step.videoKey ? videos[step.videoKey] : undefined} stepId={step.id} onContinue={handleVideoContinue} />
          </QuestionScreen>
        );

      case 'testimonials':
        return (
          <QuestionScreen title={step.title} subtitle={step.subtitle}>
            <TestimonialCase
              cases={(step.testimonialKeys ?? []).map((key) => ({ key, ...testimonialCases[key] }))}
              onContinue={handleTestimonialsContinue}
              onSkip={handleTestimonialsContinue}
            />
          </QuestionScreen>
        );

      case 'lead':
        return (
          <QuestionScreen title={step.title} subtitle={step.subtitle}>
            <LeadCapture fields={step.leadFields ?? ['nome', 'whatsapp']} buttonLabel={step.leadButtonLabel ?? 'Continuar'} onSubmit={handleLeadSubmit} />
          </QuestionScreen>
        );

      case 'result':
        return <ResultScreen session={session} />;

      default:
        return null;
    }
  }
}

function consumptionKeyFromOption(optionId: string): string {
  const map: Record<string, string> = { b_c1: '250_600', b_c2: '600_1000', b_c3: '1000_3000', b_c4: 'acima_3000' };
  return map[optionId] ?? '';
}

function TextStepBody({ placeholder, onSubmit }: { placeholder?: string; onSubmit: (value: string) => void }) {
  const [value, setValue] = useState('');
  return (
    <div className="space-y-3">
      <textarea
        value={value}
        onChange={(e) => setValue(e.target.value)}
        placeholder={placeholder}
        rows={4}
        className="w-full rounded-xl p-4 border outline-none resize-none"
        style={{ borderColor: '#E3E8EF', color: '#1A2233' }}
      />
      <button
        disabled={value.trim().length === 0}
        onClick={() => onSubmit(value.trim())}
        className="w-full h-12 rounded-xl font-bold disabled:opacity-40"
        style={{ background: '#F5A623', color: '#1A2233' }}
      >
        Continuar
      </button>
    </div>
  );
}

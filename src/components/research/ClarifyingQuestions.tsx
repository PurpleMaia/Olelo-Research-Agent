'use client';

import { useState } from 'react';
import { useResearch } from '@/hooks/contexts/ResearchContext';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { RadioGroup, RadioGroupItem } from '@/components/ui/radio-group';
import { Checkbox } from '@/components/ui/checkbox';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { Progress } from '@/components/ui/progress';
import { HelpCircle, ArrowRight } from 'lucide-react';
import type { QuestionAnswer } from '@/types/research';

export function ClarifyingQuestions() {
  const { state, submitAnswers } = useResearch();
  const [answers, setAnswers] = useState<Record<string, string | string[]>>({});
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const questions = state.clarifyingQuestions;

  if (questions.length === 0) {
    return null;
  }

  const handleTextChange = (questionId: string, value: string) => {
    setAnswers((prev) => ({ ...prev, [questionId]: value }));
  };

  const handleChoiceChange = (questionId: string, value: string) => {
    setAnswers((prev) => ({ ...prev, [questionId]: value }));
  };

  const handleMultiChoiceChange = (questionId: string, value: string, checked: boolean) => {
    setAnswers((prev) => {
      const current = (prev[questionId] as string[]) || [];
      if (checked) {
        return { ...prev, [questionId]: [...current, value] };
      } else {
        return { ...prev, [questionId]: current.filter((v) => v !== value) };
      }
    });
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);

    // Validate required questions
    const unansweredRequired = questions.filter(
      (q) => q.required && (!answers[q.id] || answers[q.id].length === 0)
    );

    if (unansweredRequired.length > 0) {
      setError('Please answer all required questions before continuing.');
      return;
    }

    // Convert to QuestionAnswer format
    const questionAnswers: QuestionAnswer[] = Object.entries(answers).map(
      ([questionId, answer]) => ({
        questionId,
        answer,
      })
    );

    setIsSubmitting(true);
    try {
      await submitAnswers(questionAnswers);
    } catch {
      setError('Failed to submit answers. Please try again.');
    } finally {
      setIsSubmitting(false);
    }
  };

  const answeredCount = Object.keys(answers).filter(
    (key) => answers[key] && answers[key].length > 0
  ).length;
  const progressPercentage = (answeredCount / questions.length) * 100;

  return (
    <Card className="w-full">
      <CardHeader>
        <div className="flex items-center gap-2">
          <HelpCircle className="h-5 w-5 text-primary" />
          <CardTitle>Help Us Understand Your Research</CardTitle>
        </div>
        <CardDescription>
          Answer these questions to help our agent find more relevant information.
        </CardDescription>
        <div className="mt-4 space-y-2">
          <div className="flex justify-between text-sm text-muted-foreground">
            <span>
              {answeredCount} of {questions.length} answered
            </span>
            <span>{Math.round(progressPercentage)}%</span>
          </div>
          <Progress value={progressPercentage} />
        </div>
      </CardHeader>

      <CardContent>
        {error && (
          <Alert variant="destructive" className="mb-4">
            <AlertDescription>{error}</AlertDescription>
          </Alert>
        )}

        <form onSubmit={handleSubmit} className="space-y-6">
          {questions.map((question, index) => (
            <div key={question.id} className="space-y-3 p-4 border rounded-lg">
              <Label className="text-base font-medium">
                {index + 1}. {question.question}
                {question.required && <span className="text-destructive ml-1">*</span>}
              </Label>

              {question.type === 'text' && (
                <Input
                  value={(answers[question.id] as string) || ''}
                  onChange={(e) => handleTextChange(question.id, e.target.value)}
                  placeholder={question.placeholder || 'Your answer...'}
                  required={question.required}
                />
              )}

              {question.type === 'choice' && question.options && (
                <RadioGroup
                  value={(answers[question.id] as string) || ''}
                  onValueChange={(value) => handleChoiceChange(question.id, value)}
                >
                  <div className="space-y-2">
                    {question.options.map((option) => (
                      <div key={option.value} className="flex items-center space-x-2">
                        <RadioGroupItem value={option.value} id={`${question.id}-${option.value}`} />
                        <Label
                          htmlFor={`${question.id}-${option.value}`}
                          className="font-normal cursor-pointer"
                        >
                          {option.label}
                        </Label>
                      </div>
                    ))}
                  </div>
                </RadioGroup>
              )}

              {question.type === 'multi-choice' && question.options && (
                <div className="space-y-2">
                  {question.options.map((option) => (
                    <div key={option.value} className="flex items-center space-x-2">
                      <Checkbox
                        id={`${question.id}-${option.value}`}
                        checked={
                          ((answers[question.id] as string[]) || []).includes(option.value)
                        }
                        onCheckedChange={(checked) =>
                          handleMultiChoiceChange(question.id, option.value, checked === true)
                        }
                      />
                      <Label
                        htmlFor={`${question.id}-${option.value}`}
                        className="font-normal cursor-pointer"
                      >
                        {option.label}
                      </Label>
                    </div>
                  ))}
                </div>
              )}

              {question.type === 'date' && (
                <Input
                  type="text"
                  value={(answers[question.id] as string) || ''}
                  onChange={(e) => handleTextChange(question.id, e.target.value)}
                  placeholder={question.placeholder || 'e.g., 1920s, 1850-1900, 19th century'}
                  required={question.required}
                />
              )}
            </div>
          ))}

          <div className="flex gap-3 pt-4">
            <Button type="submit" disabled={isSubmitting} className="flex-1" size="lg">
              <ArrowRight className="mr-2 h-4 w-4" />
              {isSubmitting ? 'Continuing Research...' : 'Continue Research'}
            </Button>
          </div>
        </form>
      </CardContent>
    </Card>
  );
}

import { useState, useEffect } from "react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Slider } from "@/components/ui/slider";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { useToast } from "@/hooks/use-toast";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/useAuth";
import { Heart, ArrowRight } from "lucide-react";

interface OnboardingProps {
  onComplete: () => void;
}

const Onboarding = ({ onComplete }: OnboardingProps) => {
  const [step, setStep] = useState(1);
  const [name, setName] = useState("");
  const [timezone, setTimezone] = useState("America/Sao_Paulo");
  const [humor, setHumor] = useState([50]);
  const [subtlety, setSubtlety] = useState([50]);
  const [boldness, setBoldness] = useState([50]);
  const [length, setLength] = useState("medium");
  const [loading, setLoading] = useState(false);
  const { user } = useAuth();
  const { toast } = useToast();

  const saveProfile = async () => {
    if (!user) return;

    setLoading(true);
    try {
      const { error } = await supabase.from("profiles").upsert({
        user_id: user.id,
        email: user.email!,
        name,
        timezone,
        preferences: {
          tone: {
            humor: humor[0],
            subtlety: subtlety[0],
            boldness: boldness[0]
          },
          length,
          blocked_topics: [],
          cultural_refs: true,
          timing_rules: true
        },
        onboarding_completed: true
      });

      if (error) throw error;

      // Create default subscription
      await supabase.from("subscriptions").upsert({
        user_id: user.id,
        plan: "free",
        status: "active",
        features: {
          conversations_per_day: 5,
          suggestions_per_conversation: 3,
          voice_notes: false,
          coach_mode: false,
          anti_catfish: false,
          custom_personality: false
        }
      });

      toast({
        title: "Perfil criado!",
        description: "Bem-vindo ao FlertaAI! Vamos começar a conquistar matches.",
      });

      onComplete();
    } catch (error) {
      console.error("Error saving profile:", error);
      toast({
        title: "Erro",
        description: "Não foi possível salvar seu perfil. Tente novamente.",
        variant: "destructive",
      });
    } finally {
      setLoading(false);
    }
  };

  const timezones = [
    { value: "America/Sao_Paulo", label: "Brasília (GMT-3)" },
    { value: "America/Manaus", label: "Manaus (GMT-4)" },
    { value: "America/Rio_Branco", label: "Rio Branco (GMT-5)" },
    { value: "America/Noronha", label: "Fernando de Noronha (GMT-2)" },
  ];

  if (step === 1) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-bg to-surface flex items-center justify-center p-4">
        <Card className="w-full max-w-md border-0 bg-surface/80 backdrop-blur">
          <CardHeader className="text-center">
            <div className="flex justify-center mb-4">
              <Heart className="h-12 w-12 text-primary animate-pulse" />
            </div>
            <CardTitle className="text-2xl text-text">Bem-vindo ao FlertaAI!</CardTitle>
            <p className="text-muted">Vamos configurar seu perfil para gerar sugestões perfeitas</p>
          </CardHeader>
          
          <CardContent className="space-y-6">
            <div className="space-y-2">
              <Label htmlFor="name">Como você gostaria de ser chamado?</Label>
              <Input
                id="name"
                placeholder="Seu nome"
                value={name}
                onChange={(e) => setName(e.target.value)}
                required
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="timezone">Seu fuso horário</Label>
              <Select value={timezone} onValueChange={setTimezone}>
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {timezones.map((tz) => (
                    <SelectItem key={tz.value} value={tz.value}>
                      {tz.label}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            <Button 
              onClick={() => setStep(2)} 
              className="w-full bg-primary hover:bg-primary-hover"
              disabled={!name.trim()}
            >
              Próximo
              <ArrowRight className="ml-2 h-4 w-4" />
            </Button>
          </CardContent>
        </Card>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-bg to-surface flex items-center justify-center p-4">
      <Card className="w-full max-w-md border-0 bg-surface/80 backdrop-blur">
        <CardHeader className="text-center">
          <CardTitle className="text-xl text-text">Configure seu estilo</CardTitle>
          <p className="text-muted">Personalize como a IA gera suas sugestões</p>
        </CardHeader>
        
        <CardContent className="space-y-6">
          <div className="space-y-4">
            <div className="space-y-2">
              <Label>Humor: {humor[0]}%</Label>
              <p className="text-sm text-muted">Quanto humor você gosta de usar?</p>
              <Slider
                value={humor}
                onValueChange={setHumor}
                max={100}
                step={10}
                className="w-full"
              />
            </div>

            <div className="space-y-2">
              <Label>Sutileza: {subtlety[0]}%</Label>
              <p className="text-sm text-muted">Prefere ser mais direto ou sutil?</p>
              <Slider
                value={subtlety}
                onValueChange={setSubtlety}
                max={100}
                step={10}
                className="w-full"
              />
            </div>

            <div className="space-y-2">
              <Label>Ousadia: {boldness[0]}%</Label>
              <p className="text-sm text-muted">Qual seu nível de ousadia?</p>
              <Slider
                value={boldness}
                onValueChange={setBoldness}
                max={100}
                step={10}
                className="w-full"
              />
            </div>

            <div className="space-y-2">
              <Label>Tamanho das mensagens</Label>
              <Select value={length} onValueChange={setLength}>
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="short">Curtas</SelectItem>
                  <SelectItem value="medium">Médias</SelectItem>
                  <SelectItem value="long">Longas</SelectItem>
                </SelectContent>
              </Select>
            </div>
          </div>

          <div className="flex gap-3">
            <Button 
              variant="outline" 
              onClick={() => setStep(1)}
              className="flex-1"
            >
              Voltar
            </Button>
            <Button 
              onClick={saveProfile}
              disabled={loading}
              className="flex-1 bg-primary hover:bg-primary-hover"
            >
              {loading ? "Salvando..." : "Finalizar"}
            </Button>
          </div>
        </CardContent>
      </Card>
    </div>
  );
};

export default Onboarding;
import { useState, useEffect } from "react";
import { useParams, useNavigate, Link } from "react-router-dom";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Slider } from "@/components/ui/slider";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Switch } from "@/components/ui/switch";
import { 
  ArrowLeft, 
  Copy, 
  RefreshCw, 
  ThumbsUp, 
  ThumbsDown, 
  Sparkles,
  HelpCircle,
  Loader2,
  CheckCircle,
  Settings
} from "lucide-react";
import { useAuth } from "@/hooks/useAuth";
import { useToast } from "@/hooks/use-toast";
import { supabase } from "@/integrations/supabase/client";

const Suggestions = () => {
  const { conversationId } = useParams();
  const { user } = useAuth();
  const { toast } = useToast();
  const navigate = useNavigate();
  
  const [conversation, setConversation] = useState<any>(null);
  const [suggestions, setSuggestions] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [generating, setGenerating] = useState(false);
  const [coachMode, setCoachMode] = useState(false);
  
  // Style preferences (local state)
  const [humor, setHumor] = useState([50]);
  const [subtlety, setSubtlety] = useState([50]);
  const [boldness, setBoldness] = useState([50]);

  useEffect(() => {
    if (conversationId && user) {
      fetchConversation();
      fetchSuggestions();
    }
  }, [conversationId, user]);

  const fetchConversation = async () => {
    try {
      const { data, error } = await supabase
        .from("conversations")
        .select("*")
        .eq("id", conversationId)
        .eq("user_id", user!.id)
        .single();

      if (error) throw error;
      setConversation(data);
    } catch (error) {
      console.error("Error fetching conversation:", error);
      toast({
        title: "Erro",
        description: "Não foi possível carregar a conversa.",
        variant: "destructive",
      });
      navigate("/app");
    }
  };

  const fetchSuggestions = async () => {
    try {
      const { data, error } = await supabase
        .from("suggestions")
        .select("*")
        .eq("conversation_id", conversationId)
        .order("created_at", { ascending: false });

      if (error) throw error;
      setSuggestions(data || []);
    } catch (error) {
      console.error("Error fetching suggestions:", error);
    } finally {
      setLoading(false);
    }
  };

  const generateSuggestions = async () => {
    setGenerating(true);
    
    try {
      const preferences = {
        tone: {
          humor: humor[0],
          subtlety: subtlety[0],
          boldness: boldness[0]
        },
        length: "medium"
      };

      const { data, error } = await supabase.functions.invoke('generate-suggestions', {
        body: {
          conversationId,
          preferences,
          coachMode
        }
      });

      if (error) throw error;

      toast({
        title: "Sugestões geradas!",
        description: `${data.suggestions.length} novas sugestões criadas.`,
      });

      fetchSuggestions();
    } catch (error) {
      console.error("Error generating suggestions:", error);
      toast({
        title: "Erro",
        description: "Não foi possível gerar sugestões. Tente novamente.",
        variant: "destructive",
      });
    } finally {
      setGenerating(false);
    }
  };

  const copySuggestion = async (suggestion: any) => {
    try {
      await navigator.clipboard.writeText(suggestion.suggestion_text);
      
      // Update suggestion as copied
      await supabase
        .from("suggestions")
        .update({ 
          copied_at: new Date().toISOString(),
          accepted: true 
        })
        .eq("id", suggestion.id);

      toast({
        title: "Copiado!",
        description: "Sugestão copiada para a área de transferência.",
      });

      fetchSuggestions();
    } catch (error) {
      toast({
        title: "Erro",
        description: "Não foi possível copiar a sugestão.",
        variant: "destructive",
      });
    }
  };

  const giveFeedback = async (suggestionId: string, score: number) => {
    try {
      await supabase
        .from("suggestions")
        .update({ feedback_score: score })
        .eq("id", suggestionId);

      toast({
        title: "Feedback registrado!",
        description: "Obrigado pelo feedback. Isso nos ajuda a melhorar.",
      });

      fetchSuggestions();
    } catch (error) {
      console.error("Error giving feedback:", error);
    }
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-bg to-surface flex items-center justify-center">
        <div className="text-center">
          <Loader2 className="h-12 w-12 animate-spin text-primary mx-auto mb-4" />
          <p className="text-muted">Carregando conversa...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-bg to-surface">
      {/* Header */}
      <header className="border-b border-surface bg-bg/80 backdrop-blur sticky top-0 z-50">
        <div className="container mx-auto px-4 py-4 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <Button variant="ghost" size="sm" asChild>
              <Link to="/app">
                <ArrowLeft className="h-4 w-4" />
              </Link>
            </Button>
            <div>
              <h1 className="text-xl font-bold text-text">Sugestões IA</h1>
              {conversation && (
                <p className="text-sm text-muted">
                  {conversation.title || `Conversa no ${conversation.platform}`}
                </p>
              )}
            </div>
          </div>
          
          <Badge variant="outline" className="text-primary border-primary">
            {conversation?.platform}
          </Badge>
        </div>
      </header>

      <div className="container mx-auto px-4 py-8">
        <div className="max-w-4xl mx-auto space-y-6">
          
          {/* Style Controls */}
          <Card className="border-0 bg-surface/50">
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Settings className="h-5 w-5 text-primary" />
                Personalizar estilo
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-6">
              <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                <div className="space-y-2">
                  <Label>Humor: {humor[0]}%</Label>
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
                  <Slider
                    value={boldness}
                    onValueChange={setBoldness}
                    max={100}
                    step={10}
                    className="w-full"
                  />
                </div>
              </div>

              <div className="flex items-center justify-between">
                <div className="flex items-center space-x-2">
                  <Switch
                    id="coach-mode"
                    checked={coachMode}
                    onCheckedChange={setCoachMode}
                  />
                  <Label htmlFor="coach-mode" className="flex items-center gap-2">
                    <HelpCircle className="h-4 w-4" />
                    Coach Mode (explica o porquê)
                  </Label>
                </div>

                <Button
                  onClick={generateSuggestions}
                  disabled={generating}
                  className="bg-primary hover:bg-primary-hover"
                >
                  {generating ? (
                    <>
                      <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                      Gerando...
                    </>
                  ) : (
                    <>
                      <Sparkles className="mr-2 h-4 w-4" />
                      Gerar sugestões
                    </>
                  )}
                </Button>
              </div>
            </CardContent>
          </Card>

          {/* Conversation Preview */}
          {conversation && (
            <Card className="border-0 bg-surface/50">
              <CardHeader>
                <CardTitle>Prévia da conversa</CardTitle>
                <p className="text-sm text-muted">
                  Baseado nas imagens enviadas • {conversation.platform}
                </p>
              </CardHeader>
              <CardContent>
                <div className="bg-bg/50 rounded-lg p-4 max-h-40 overflow-y-auto">
                  {conversation.parsed_messages && conversation.parsed_messages.length > 0 ? (
                    <div className="space-y-3">
                      {conversation.parsed_messages.slice(-6).map((message: any, index: number) => (
                        <div
                          key={index}
                          className={`flex ${message.role === 'user' ? 'justify-end' : 'justify-start'}`}
                        >
                          <div
                            className={`max-w-[80%] p-3 rounded-lg text-sm ${
                              message.role === 'user'
                                ? 'bg-primary text-white rounded-br-sm'
                                : 'bg-surface border rounded-bl-sm'
                            }`}
                          >
                            <p>{message.content}</p>
                          </div>
                        </div>
                      ))}
                      {conversation.parsed_messages.length > 6 && (
                        <p className="text-xs text-muted text-center">
                          ... mostrando últimas 6 mensagens
                        </p>
                      )}
                    </div>
                  ) : (
                    <p className="text-muted text-center py-4">
                      Nenhuma mensagem detectada
                    </p>
                  )}
                </div>
              </CardContent>
            </Card>
          )}

          {/* Suggestions */}
          <div className="space-y-4">
            <h3 className="text-xl font-semibold text-text">
              Sugestões ({suggestions.length})
            </h3>
            
            {suggestions.length === 0 ? (
              <Card className="border-0 bg-surface/50">
                <CardContent className="p-8 text-center">
                  <Sparkles className="h-12 w-12 text-muted mx-auto mb-4" />
                  <h4 className="font-medium text-text mb-2">Nenhuma sugestão ainda</h4>
                  <p className="text-muted mb-4">
                    Clique em "Gerar sugestões" para receber ideias de resposta personalizadas.
                  </p>
                </CardContent>
              </Card>
            ) : (
              suggestions.map((suggestion) => (
                <Card key={suggestion.id} className="border-0 bg-surface/50">
                  <CardContent className="p-6">
                    <div className="space-y-4">
                      <div className="flex items-start justify-between gap-4">
                        <div className="flex-1">
                          <p className="text-text text-lg leading-relaxed">
                            {suggestion.suggestion_text}
                          </p>
                        </div>
                        
                        <div className="flex items-center gap-2">
                          {suggestion.copied_at && (
                            <CheckCircle className="h-5 w-5 text-success" />
                          )}
                          <Button
                            size="sm"
                            onClick={() => copySuggestion(suggestion)}
                            className="bg-primary hover:bg-primary-hover"
                          >
                            <Copy className="h-4 w-4" />
                          </Button>
                        </div>
                      </div>

                      {/* Coach Mode Reasoning */}
                      {suggestion.reasoning && suggestion.reasoning.length > 0 && (
                        <div className="bg-primary/10 p-4 rounded-lg">
                          <h5 className="font-medium text-primary mb-2 flex items-center gap-2">
                            <HelpCircle className="h-4 w-4" />
                            Por que funciona:
                          </h5>
                          <ul className="text-sm text-muted space-y-1">
                            {suggestion.reasoning.map((reason: string, index: number) => (
                              <li key={index}>• {reason}</li>
                            ))}
                          </ul>
                        </div>
                      )}

                      {/* Alternatives */}
                      {suggestion.alternatives && suggestion.alternatives.length > 0 && (
                        <div className="space-y-2">
                          <p className="text-sm font-medium text-muted">Alternativas:</p>
                          {suggestion.alternatives.map((alt: string, index: number) => (
                            <p key={index} className="text-sm text-muted bg-bg/50 p-2 rounded">
                              {alt}
                            </p>
                          ))}
                        </div>
                      )}

                      {/* Feedback */}
                      <div className="flex items-center justify-between pt-2 border-t border-muted/20">
                        <div className="flex items-center gap-2">
                          <span className="text-sm text-muted">Útil?</span>
                          <Button
                            variant="ghost"
                            size="sm"
                            onClick={() => giveFeedback(suggestion.id, 5)}
                            className={suggestion.feedback_score === 5 ? "text-success" : ""}
                          >
                            <ThumbsUp className="h-4 w-4" />
                          </Button>
                          <Button
                            variant="ghost"
                            size="sm"
                            onClick={() => giveFeedback(suggestion.id, 1)}
                            className={suggestion.feedback_score === 1 ? "text-danger" : ""}
                          >
                            <ThumbsDown className="h-4 w-4" />
                          </Button>
                        </div>
                        
                        <span className="text-xs text-muted">
                          {new Date(suggestion.created_at).toLocaleString("pt-BR")}
                        </span>
                      </div>
                    </div>
                  </CardContent>
                </Card>
              ))
            )}
          </div>
        </div>
      </div>
    </div>
  );
};

export default Suggestions;
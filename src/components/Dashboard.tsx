import { useState, useEffect } from "react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { 
  Upload, 
  MessageSquare, 
  Mic, 
  TrendingUp, 
  Target, 
  Heart, 
  Settings,
  LogOut,
  Camera,
  FileText,
  Sparkles
} from "lucide-react";
import { useAuth } from "@/hooks/useAuth";
import { supabase } from "@/integrations/supabase/client";
import { useToast } from "@/hooks/use-toast";
import { useNavigate, Link } from "react-router-dom";

interface DashboardProps {
  profile: any;
}

const Dashboard = ({ profile }: DashboardProps) => {
  const { signOut } = useAuth();
  const { toast } = useToast();
  const navigate = useNavigate();
  const [stats, setStats] = useState({
    conversations: 0,
    suggestions: 0,
    successRate: 0,
    matches: 0
  });
  const [recentConversations, setRecentConversations] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetchStats();
    fetchRecentConversations();
  }, []);

  const fetchStats = async () => {
    try {
      // Fetch conversation count
      const { count: conversationCount } = await supabase
        .from("conversations")
        .select("*", { count: "exact", head: true })
        .eq("user_id", profile.user_id);

      // Fetch suggestions count
      const { count: suggestionCount } = await supabase
        .from("suggestions")
        .select("*", { count: "exact", head: true })
        .in("conversation_id", 
          await supabase
            .from("conversations")
            .select("id")
            .eq("user_id", profile.user_id)
            .then(({ data }) => data?.map(c => c.id) || [])
        );

      // Fetch matches count
      const { count: matchCount } = await supabase
        .from("conversation_outcomes")
        .select("*", { count: "exact", head: true })
        .eq("outcome", "match")
        .in("conversation_id",
          await supabase
            .from("conversations")
            .select("id")
            .eq("user_id", profile.user_id)
            .then(({ data }) => data?.map(c => c.id) || [])
        );

      const successRate = conversationCount > 0 ? Math.round((matchCount || 0) / conversationCount * 100) : 0;

      setStats({
        conversations: conversationCount || 0,
        suggestions: suggestionCount || 0,
        successRate,
        matches: matchCount || 0
      });
    } catch (error) {
      console.error("Error fetching stats:", error);
    }
  };

  const fetchRecentConversations = async () => {
    try {
      const { data } = await supabase
        .from("conversations")
        .select("*")
        .eq("user_id", profile.user_id)
        .order("created_at", { ascending: false })
        .limit(5);

      setRecentConversations(data || []);
    } catch (error) {
      console.error("Error fetching conversations:", error);
    } finally {
      setLoading(false);
    }
  };

  const handleSignOut = async () => {
    const { error } = await signOut();
    if (error) {
      toast({
        title: "Erro",
        description: "Não foi possível fazer logout.",
        variant: "destructive",
      });
    } else {
      navigate("/");
    }
  };

  const getGreeting = () => {
    const hour = new Date().getHours();
    if (hour < 12) return "Bom dia";
    if (hour < 18) return "Boa tarde";
    return "Boa noite";
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-bg to-surface">
      {/* Header */}
      <header className="border-b border-surface bg-bg/80 backdrop-blur sticky top-0 z-50">
        <div className="container mx-auto px-4 py-4 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <Heart className="h-8 w-8 text-primary" />
            <h1 className="text-xl font-bold text-text">FlertaAI</h1>
          </div>
          
          <div className="flex items-center gap-4">
            <Badge variant="outline" className="text-primary border-primary">
              Plano Free
            </Badge>
            <Button variant="ghost" size="sm">
              <Settings className="h-4 w-4" />
            </Button>
            <Button variant="ghost" size="sm" onClick={handleSignOut}>
              <LogOut className="h-4 w-4" />
            </Button>
          </div>
        </div>
      </header>

      <div className="container mx-auto px-4 py-8">
        {/* Welcome Section */}
        <div className="mb-8">
          <h2 className="text-3xl font-bold text-text mb-2">
            {getGreeting()}, {profile.name}! 👋
          </h2>
          <p className="text-muted">
            Pronto para conquistar mais matches hoje?
          </p>
        </div>

        {/* Stats Cards */}
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-8">
          <Card className="border-0 bg-surface/50">
            <CardContent className="p-4 text-center">
              <MessageSquare className="h-6 w-6 text-primary mx-auto mb-2" />
              <p className="text-2xl font-bold text-text">{stats.conversations}</p>
              <p className="text-sm text-muted">Conversas</p>
            </CardContent>
          </Card>
          
          <Card className="border-0 bg-surface/50">
            <CardContent className="p-4 text-center">
              <Sparkles className="h-6 w-6 text-accent mx-auto mb-2" />
              <p className="text-2xl font-bold text-text">{stats.suggestions}</p>
              <p className="text-sm text-muted">Sugestões</p>
            </CardContent>
          </Card>
          
          <Card className="border-0 bg-surface/50">
            <CardContent className="p-4 text-center">
              <TrendingUp className="h-6 w-6 text-success mx-auto mb-2" />
              <p className="text-2xl font-bold text-text">{stats.successRate}%</p>
              <p className="text-sm text-muted">Taxa de sucesso</p>
            </CardContent>
          </Card>
          
          <Card className="border-0 bg-surface/50">
            <CardContent className="p-4 text-center">
              <Target className="h-6 w-6 text-danger mx-auto mb-2" />
              <p className="text-2xl font-bold text-text">{stats.matches}</p>
              <p className="text-sm text-muted">Matches</p>
            </CardContent>
          </Card>
        </div>

        {/* Quick Actions */}
        <div className="mb-8">
          <h3 className="text-xl font-semibold text-text mb-4">Ações rápidas</h3>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <Card className="border-0 bg-surface/50 hover:bg-surface/70 transition-colors cursor-pointer">
              <Link to="/app/upload">
                <CardContent className="p-6 text-center">
                  <Camera className="h-8 w-8 text-primary mx-auto mb-3" />
                  <h4 className="font-semibold text-text mb-2">Upload de Screenshot</h4>
                  <p className="text-sm text-muted">Faça upload de uma conversa para receber sugestões</p>
                </CardContent>
              </Link>
            </Card>
            
            <Card className="border-0 bg-surface/50 hover:bg-surface/70 transition-colors cursor-pointer">
              <CardContent className="p-6 text-center">
                <FileText className="h-8 w-8 text-accent mx-auto mb-3" />
                <h4 className="font-semibold text-text mb-2">Texto Manual</h4>
                <p className="text-sm text-muted">Digite uma conversa manualmente</p>
              </CardContent>
            </Card>
            
            <Card className="border-0 bg-surface/50 hover:bg-surface/70 transition-colors cursor-pointer opacity-50">
              <CardContent className="p-6 text-center">
                <Mic className="h-8 w-8 text-warning mx-auto mb-3" />
                <h4 className="font-semibold text-text mb-2">Nota de Voz</h4>
                <p className="text-sm text-muted">Grave uma conversa (Pro)</p>
              </CardContent>
            </Card>
          </div>
        </div>

        {/* Recent Conversations */}
        <div>
          <h3 className="text-xl font-semibold text-text mb-4">Conversas recentes</h3>
          {loading ? (
            <div className="text-center py-8">
              <div className="h-8 w-8 animate-spin rounded-full border-4 border-primary border-t-transparent mx-auto mb-2"></div>
              <p className="text-muted">Carregando conversas...</p>
            </div>
          ) : recentConversations.length > 0 ? (
            <div className="space-y-3">
              {recentConversations.map((conversation: any) => (
                <Card key={conversation.id} className="border-0 bg-surface/50">
                  <CardContent className="p-4">
                    <div className="flex items-center justify-between">
                      <div>
                        <h4 className="font-medium text-text">
                          {conversation.title || `Conversa no ${conversation.platform}`}
                        </h4>
                        <p className="text-sm text-muted">
                          {new Date(conversation.created_at).toLocaleDateString("pt-BR")}
                        </p>
                      </div>
                      <Badge variant="outline">
                        {conversation.platform}
                      </Badge>
                    </div>
                  </CardContent>
                </Card>
              ))}
            </div>
          ) : (
            <Card className="border-0 bg-surface/50">
              <CardContent className="p-8 text-center">
                <MessageSquare className="h-12 w-12 text-muted mx-auto mb-4" />
                <h4 className="font-medium text-text mb-2">Nenhuma conversa ainda</h4>
                <p className="text-muted mb-4">
                  Faça upload de uma screenshot para começar a receber sugestões!
                </p>
                <Button className="bg-primary hover:bg-primary-hover" asChild>
                  <Link to="/app/upload">
                    <Upload className="mr-2 h-4 w-4" />
                    Primeira conversa
                  </Link>
                </Button>
              </CardContent>
            </Card>
          )}
        </div>
      </div>
    </div>
  );
};

export default Dashboard;
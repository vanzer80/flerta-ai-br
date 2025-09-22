import "https://deno.land/x/xhr@0.1.0/mod.ts";
import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2.57.4';

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

// Anti-generic patterns to block clichés
const BLOCKED_PATTERNS = [
  /\boi\s+sumida\b/i,
  /\bcomo\s+vai\b/i,
  /\btudo\s+bem\b/i,
  /\bboa\s+noite\s+linda\b/i,
  /\bgatinha\b/i,
  /\bgostosa\b/i,
  /\be\s+aí\b/i,
];

// Technical terms to filter out - don't use in romantic suggestions
const TECHNICAL_TERMS = [
  'terraform', 'deploy', 'código', 'codigos', 'projeto', 'implementar', 'implementando',
  'javascript', 'python', 'react', 'node', 'api', 'backend', 'frontend', 'database',
  'git', 'github', 'docker', 'kubernetes', 'aws', 'cloud', 'devops', 'ci/cd',
  'programming', 'developer', 'tech', 'software', 'hardware', 'framework',
  'biblioteca', 'library', 'function', 'variable', 'array', 'object', 'class',
  'integration', 'integração', 'continuous', 'contínua', 'pipeline', 'repository'
];

const ANTI_GENERIC_PHRASES = [
  "copy-paste pickup lines",
  "clichê responses", 
  "generic openers",
  "boring conversations",
  "predictable messages"
];

function detectGenericContent(text: string): boolean {
  // Check for blocked patterns
  for (const pattern of BLOCKED_PATTERNS) {
    if (pattern.test(text)) return true;
  }
  
  // Check for anti-generic phrases
  for (const phrase of ANTI_GENERIC_PHRASES) {
    if (text.toLowerCase().includes(phrase.toLowerCase())) return true;
  }
  
  // Check for technical terms that shouldn't appear in romantic suggestions
  const lowerText = text.toLowerCase();
  for (const term of TECHNICAL_TERMS) {
    if (lowerText.includes(term.toLowerCase())) {
      console.log(`Blocked suggestion with technical term: ${term}`);
      return true;
    }
  }
  
  return false;
}

function extractConversationContext(conversation: any): string {
  // Prioriza mensagens parseadas se disponíveis
  if (conversation.parsed_messages && conversation.parsed_messages.length > 0) {
    const recentMessages = conversation.parsed_messages
      .slice(-10) // Últimas 10 mensagens
      .filter((msg: any) => msg.content && msg.content.length > 3)
      .map((msg: any) => `${msg.role === 'user' ? 'Você' : 'Match'}: ${msg.content}`)
      .join('\n');
    
    if (recentMessages.trim()) {
      return recentMessages;
    }
  }
  
  // Fallback para OCR text limpo
  return filterTechnicalContext(conversation.ocr_text || '');
}

function filterTechnicalContext(text: string): string {
  // Remove caracteres estranhos e limpa o texto
  let cleaned = text
    .replace(/[^\w\s\nÀ-ÿ:.,!?()-]/g, ' ')
    .replace(/\s+/g, ' ')
    .replace(/\n\s*\n/g, '\n')
    .trim();
  
  // Remove sentences containing technical terms
  const sentences = cleaned.split(/[.!?]+/);
  const filteredSentences = sentences.filter(sentence => {
    const lowerSentence = sentence.toLowerCase();
    return !TECHNICAL_TERMS.some(term => lowerSentence.includes(term.toLowerCase())) &&
           sentence.trim().length > 5 && // Remove sentenças muito curtas
           !/^\d+[\s.,:-]*$/.test(sentence.trim()); // Remove números soltos
  });
  
  // Se filtrou muito, retorna com instrução especial
  if (filteredSentences.length < Math.max(2, sentences.length * 0.3)) {
    return "[FOCO: Ignore informações técnicas e números. Baseie-se apenas no contexto pessoal/romântico]\n" + 
           filteredSentences.slice(0, 5).join('. ').trim();
  }
  
  return filteredSentences.join('. ').trim();
}

function getTimeBasedGreeting() {
  const hour = new Date().getHours();
  if (hour >= 6 && hour < 12) return "manhã";
  if (hour >= 12 && hour < 18) return "tarde";
  if (hour >= 18 && hour < 22) return "noite";
  return "madrugada";
}

serve(async (req) => {
  // Handle CORS preflight requests
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const { conversationId, preferences, coachMode } = await req.json();
    
    if (!conversationId) {
      throw new Error('conversationId é obrigatório');
    }

    const openAIApiKey = Deno.env.get('OPENAI_API_KEY');
    if (!openAIApiKey) {
      throw new Error('OPENAI_API_KEY não configurada');
    }

    // Initialize Supabase client
    const supabaseUrl = Deno.env.get('SUPABASE_URL')!;
    const supabaseKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!;
    const supabase = createClient(supabaseUrl, supabaseKey);

    // Fetch conversation data
    const { data: conversation, error: convError } = await supabase
      .from('conversations')
      .select('*')
      .eq('id', conversationId)
      .single();

    if (convError) {
      throw new Error(`Erro ao buscar conversa: ${convError.message}`);
    }

    // Fetch user profile for preferences
    const { data: profile, error: profileError } = await supabase
      .from('profiles')
      .select('*')
      .eq('user_id', conversation.user_id)
      .single();

    if (profileError) {
      throw new Error(`Erro ao buscar perfil: ${profileError.message}`);
    }

    // Prepare context for AI
    const userPrefs = preferences || profile.preferences;
    const timeOfDay = getTimeBasedGreeting();
    
    // Extract clean conversation context
    const conversationContext = extractConversationContext(conversation);
    
    const contextPrompt = `
Você é o FlertaAI, especialista em conversas românticas brasileiras.

CONTEXTO DA CONVERSA:
Plataforma: ${conversation.platform}
Horário: ${timeOfDay}
Localização: Brasil (${profile.timezone})

PREFERÊNCIAS DO USUÁRIO:
- Humor: ${userPrefs.tone.humor}%
- Sutileza: ${userPrefs.tone.subtlety}%
- Ousadia: ${userPrefs.tone.boldness}%
- Tamanho: ${userPrefs.length}

CONTEXTO DA CONVERSA:
${conversationContext}

INSTRUÇÕES CRÍTICAS:
1. NUNCA use clichês como "oi sumida", "como vai", "tudo bem", "gatinha", "gostosa"
2. Seja autenticamente brasileiro - use gírias naturais, referências culturais
3. Adapte ao horário (manhã/tarde/noite/madrugada)
4. Responda com base APENAS no contexto romântico/pessoal da conversa
5. IGNORE completamente qualquer conteúdo técnico, profissional ou sobre programação
6. NÃO faça referências a: código, programação, tecnologia, trabalho, projetos técnicos
7. Foque apenas nos aspectos humanos, emocionais e de conexão pessoal
8. Se humor alto: seja divertido mas não forçado
9. Se sutileza alta: seja indireta e elegante
10. Se ousadia alta: seja confiante mas respeitoso
11. Considere o tom da plataforma (Tinder = casual, WhatsApp = pessoal)

${coachMode ? `
MODO COACH ATIVADO:
- Explique PORQUE cada sugestão funciona
- Dê dicas de timing e contexto
- Ajude a entender a psicologia por trás
` : ''}

Gere ${coachMode ? '3' : '5'} sugestões criativas e autênticas. Evite respostas genéricas a todo custo.
`;

    // Call OpenAI API
    const response = await fetch('https://api.openai.com/v1/chat/completions', {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${openAIApiKey}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        model: 'gpt-4o',
        messages: [
          {
            role: 'system',
            content: contextPrompt
          },
          {
            role: 'user',
            content: 'Gere sugestões de resposta para esta conversa, seguindo as instruções.'
          }
        ],
        temperature: 0.8,
        max_tokens: 1000,
      }),
    });

    if (!response.ok) {
      const errorData = await response.json();
      throw new Error(`OpenAI API error: ${errorData.error?.message || 'Unknown error'}`);
    }

    const openAIData = await response.json();
    const aiResponse = openAIData.choices[0].message.content;
    
    // Parse AI response into suggestions
    const suggestionLines = aiResponse.split('\n').filter(line => 
      line.trim() && (line.includes('1.') || line.includes('2.') || line.includes('3.') || line.includes('4.') || line.includes('5.'))
    );

    const suggestions = [];
    
    for (let i = 0; i < Math.min(suggestionLines.length, coachMode ? 3 : 5); i++) {
      const suggestionText = suggestionLines[i]
        .replace(/^\d+\.\s*/, '')
        .replace(/^-\s*/, '')
        .trim();
      
      // Skip if generic content detected
      if (detectGenericContent(suggestionText)) {
        console.log(`Blocked generic suggestion: ${suggestionText}`);
        continue;
      }

      // Generate reasoning for coach mode
      let reasoning = [];
      if (coachMode) {
        reasoning = [
          `Adaptada ao horário da ${timeOfDay}`,
          `Tom ajustado para suas preferências (humor: ${userPrefs.tone.humor}%, sutileza: ${userPrefs.tone.subtlety}%)`,
          `Contexto brasileiro autêntico para ${conversation.platform}`
        ];
      }

      // Cultural context
      const culturalContext = {
        time_awareness: true,
        platform_appropriate: true,
        brazilian_tone: true,
        region: profile.timezone
      };

      // Generate alternatives
      const alternatives = [
        suggestionText.replace(/\b(cara|mano)\b/g, 'pessoa'),
        suggestionText.replace(/\b(massa|legal)\b/g, 'interessante')
      ].filter(alt => alt !== suggestionText);

      const suggestion = {
        suggestion_text: suggestionText,
        style: {
          tone: userPrefs.tone,
          length: userPrefs.length,
          platform: conversation.platform,
          time_of_day: timeOfDay
        },
        reasoning,
        alternatives: alternatives.slice(0, 2),
        cultural_context: culturalContext,
        timing_appropriate: true
      };

      suggestions.push(suggestion);
    }

    // If no valid suggestions after filtering, regenerate
    if (suggestions.length === 0) {
      console.log('No valid suggestions after anti-generic filtering, regenerating...');
      throw new Error('Todas as sugestões foram bloqueadas por serem muito genéricas. Tentando novamente...');
    }

    // Save suggestions to database
    const suggestionInserts = suggestions.map(suggestion => ({
      conversation_id: conversationId,
      ...suggestion
    }));

    const { data: savedSuggestions, error: saveError } = await supabase
      .from('suggestions')
      .insert(suggestionInserts)
      .select();

    if (saveError) {
      console.error('Error saving suggestions:', saveError);
      throw new Error(`Erro ao salvar sugestões: ${saveError.message}`);
    }

    console.log(`Generated ${suggestions.length} suggestions for conversation ${conversationId}`);

    return new Response(
      JSON.stringify({ 
        suggestions: savedSuggestions,
        anti_generic_check: true,
        coach_mode: coachMode
      }),
      {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      }
    );

  } catch (error) {
    console.error('Error in generate-suggestions function:', error);
    return new Response(
      JSON.stringify({ error: error.message }),
      {
        status: 500,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      }
    );
  }
});
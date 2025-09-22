import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Check, Shield, Globe, Zap, Heart, Star } from "lucide-react";
import { Link } from "react-router-dom";

const Landing = () => {
  return (
    <div className="min-h-screen bg-gradient-to-br from-bg to-surface">
      {/* Hero Section */}
      <section className="relative overflow-hidden px-4 py-16 text-center">
        <div className="mx-auto max-w-4xl">
          <div className="mb-8 flex justify-center">
            <Heart className="h-16 w-16 text-primary animate-pulse" />
          </div>
          
          <h1 className="mb-6 text-4xl font-bold tracking-tight text-text md:text-6xl">
            Conquiste matches com{" "}
            <span className="bg-gradient-to-r from-primary to-accent bg-clip-text text-transparent">
              respostas inteligentes
            </span>
          </h1>
          
          <p className="mb-8 text-xl text-muted md:text-2xl">
            IA que entende o jeito brasileiro de flertar
          </p>
          
          <div className="flex flex-col gap-4 sm:flex-row sm:justify-center">
            <Button asChild size="lg" className="bg-primary hover:bg-primary-hover text-white font-semibold px-8 py-3">
              <Link to="/auth">Começar Grátis</Link>
            </Button>
            <Button variant="outline" size="lg" className="font-semibold px-8 py-3">
              Ver como funciona
            </Button>
          </div>
        </div>
      </section>

      {/* Benefits Section */}
      <section className="px-4 py-16">
        <div className="mx-auto max-w-6xl">
          <div className="grid gap-8 md:grid-cols-3">
            <Card className="border-0 bg-surface/80 backdrop-blur">
              <CardContent className="p-6 text-center">
                <Shield className="mx-auto mb-4 h-12 w-12 text-primary" />
                <h3 className="mb-2 text-xl font-semibold text-text">100% Privado</h3>
                <p className="text-muted">
                  OCR local, sem envio de imagens. Seus dados ficam apenas com você.
                </p>
              </CardContent>
            </Card>
            
            <Card className="border-0 bg-surface/80 backdrop-blur">
              <CardContent className="p-6 text-center">
                <Globe className="mx-auto mb-4 h-12 w-12 text-accent" />
                <h3 className="mb-2 text-xl font-semibold text-text">Contexto Brasileiro</h3>
                <p className="text-muted">
                  IA treinada na cultura brasileira, horários locais e gírias autênticas.
                </p>
              </CardContent>
            </Card>
            
            <Card className="border-0 bg-surface/80 backdrop-blur">
              <CardContent className="p-6 text-center">
                <Zap className="mx-auto mb-4 h-12 w-12 text-warning" />
                <h3 className="mb-2 text-xl font-semibold text-text">Super Rápido</h3>
                <p className="text-muted">
                  Respostas em menos de 3 segundos. Não perca o timing da conversa.
                </p>
              </CardContent>
            </Card>
          </div>
        </div>
      </section>

      {/* Testimonials Section */}
      <section className="px-4 py-16 bg-surface/50">
        <div className="mx-auto max-w-4xl text-center">
          <h2 className="mb-12 text-3xl font-bold text-text">
            O que nossos usuários falam
          </h2>
          
          <div className="grid gap-8 md:grid-cols-2">
            <Card className="border-0 bg-bg/80">
              <CardContent className="p-6">
                <div className="mb-4 flex justify-center">
                  {[...Array(5)].map((_, i) => (
                    <Star key={i} className="h-5 w-5 fill-primary text-primary" />
                  ))}
                </div>
                <p className="mb-4 text-muted">
                  "Consegui 3 matches novos na primeira semana! As sugestões são naturais e divertidas."
                </p>
                <p className="font-semibold text-text">— Lucas, 28 anos</p>
              </CardContent>
            </Card>
            
            <Card className="border-0 bg-bg/80">
              <CardContent className="p-6">
                <div className="mb-4 flex justify-center">
                  {[...Array(5)].map((_, i) => (
                    <Star key={i} className="h-5 w-5 fill-primary text-primary" />
                  ))}
                </div>
                <p className="mb-4 text-muted">
                  "Finalmente um app que entende o brasileiro! Acabou o branco na conversa."
                </p>
                <p className="font-semibold text-text">— Amanda, 25 anos</p>
              </CardContent>
            </Card>
          </div>
        </div>
      </section>

      {/* Pricing Section */}
      <section className="px-4 py-16">
        <div className="mx-auto max-w-6xl">
          <h2 className="mb-12 text-center text-3xl font-bold text-text">
            Planos simples e transparentes
          </h2>
          
          <div className="grid gap-8 md:grid-cols-3">
            {/* Free Plan */}
            <Card className="border-2 border-muted/20">
              <CardContent className="p-6">
                <h3 className="mb-2 text-xl font-semibold text-text">Free</h3>
                <div className="mb-4">
                  <span className="text-3xl font-bold text-primary">R$ 0</span>
                  <span className="text-muted">/mês</span>
                </div>
                <ul className="mb-6 space-y-2">
                  <li className="flex items-center gap-2">
                    <Check className="h-5 w-5 text-success" />
                    <span className="text-muted">5 conversas por dia</span>
                  </li>
                  <li className="flex items-center gap-2">
                    <Check className="h-5 w-5 text-success" />
                    <span className="text-muted">3 sugestões por conversa</span>
                  </li>
                  <li className="flex items-center gap-2">
                    <Check className="h-5 w-5 text-success" />
                    <span className="text-muted">OCR básico</span>
                  </li>
                </ul>
                <Button variant="outline" className="w-full">
                  Começar grátis
                </Button>
              </CardContent>
            </Card>

            {/* Pro Plan */}
            <Card className="border-2 border-primary relative">
              <div className="absolute -top-4 left-1/2 -translate-x-1/2">
                <span className="bg-primary px-4 py-1 text-sm font-semibold text-white rounded-full">
                  Mais Popular
                </span>
              </div>
              <CardContent className="p-6">
                <h3 className="mb-2 text-xl font-semibold text-text">Pro</h3>
                <div className="mb-4">
                  <span className="text-3xl font-bold text-primary">R$ 29</span>
                  <span className="text-muted">/mês</span>
                </div>
                <ul className="mb-6 space-y-2">
                  <li className="flex items-center gap-2">
                    <Check className="h-5 w-5 text-success" />
                    <span className="text-muted">Conversas ilimitadas</span>
                  </li>
                  <li className="flex items-center gap-2">
                    <Check className="h-5 w-5 text-success" />
                    <span className="text-muted">5 sugestões por conversa</span>
                  </li>
                  <li className="flex items-center gap-2">
                    <Check className="h-5 w-5 text-success" />
                    <span className="text-muted">Notas de voz</span>
                  </li>
                  <li className="flex items-center gap-2">
                    <Check className="h-5 w-5 text-success" />
                    <span className="text-muted">OCR avançado</span>
                  </li>
                </ul>
                <Button className="w-full bg-primary hover:bg-primary-hover">
                  Assinar Pro
                </Button>
              </CardContent>
            </Card>

            {/* Premium Plan */}
            <Card className="border-2 border-accent">
              <CardContent className="p-6">
                <h3 className="mb-2 text-xl font-semibold text-text">Premium</h3>
                <div className="mb-4">
                  <span className="text-3xl font-bold text-accent">R$ 199</span>
                  <span className="text-muted">/ano</span>
                </div>
                <ul className="mb-6 space-y-2">
                  <li className="flex items-center gap-2">
                    <Check className="h-5 w-5 text-success" />
                    <span className="text-muted">Tudo do Pro</span>
                  </li>
                  <li className="flex items-center gap-2">
                    <Check className="h-5 w-5 text-success" />
                    <span className="text-muted">Coach Mode</span>
                  </li>
                  <li className="flex items-center gap-2">
                    <Check className="h-5 w-5 text-success" />
                    <span className="text-muted">Anti-catfish</span>
                  </li>
                  <li className="flex items-center gap-2">
                    <Check className="h-5 w-5 text-success" />
                    <span className="text-muted">Personalidade customizada</span>
                  </li>
                </ul>
                <Button variant="outline" className="w-full border-accent text-accent hover:bg-accent hover:text-white">
                  Assinar Premium
                </Button>
              </CardContent>
            </Card>
          </div>
        </div>
      </section>

      {/* CTA Section */}
      <section className="px-4 py-16 bg-gradient-to-r from-primary to-accent">
        <div className="mx-auto max-w-4xl text-center">
          <h2 className="mb-4 text-3xl font-bold text-white">
            Pronto para conquistar mais matches?
          </h2>
          <p className="mb-8 text-xl text-white/90">
            Junte-se a milhares de brasileiros que já estão flertando melhor
          </p>
          <Button asChild size="lg" variant="outline" className="bg-white text-primary hover:bg-white/90 font-semibold px-8 py-3">
            <Link to="/auth">Começar agora grátis</Link>
          </Button>
        </div>
      </section>
    </div>
  );
};

export default Landing;

'use client';

import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Card, CardHeader, CardTitle, CardDescription, CardContent, CardFooter } from "@/components/ui/card";
import { useToast } from "@/hooks/use-toast";
import { BadgeCheck, CheckCircle, HandHeart, Loader2 } from "lucide-react";
import { useAuth } from "@/hooks/use-auth";
import { useRouter } from "next/navigation";

type TierName = "Básico" | "VIP" | "Patrocinador";

const tiers = [
  {
    name: "Apoiador Básico" as TierName,
    price: "R$5",
    priceSuffix: "/mês",
    priceId: 5,
    description: "Para quem quer dar o primeiro passo e ajudar a plataforma a crescer.",
    features: [
      { text: "Selo de verificação Bronze", icon: <BadgeCheck className="h-5 w-5 text-amber-600 mr-2 shrink-0 mt-0.5" /> },
    ],
    buttonText: "Apoiar",
    variant: "secondary",
  },
  {
    name: "Apoiador VIP" as TierName,
    price: "R$20",
    priceSuffix: "/mês",
    priceId: 20,
    description: "Para os entusiastas que desejam uma experiência aprimorada e acesso antecipado.",
    features: [
      { text: "Selo de verificação Prata", icon: <BadgeCheck className="h-5 w-5 text-slate-400 mr-2 shrink-0 mt-0.5" /> },
      { text: "Opções avançadas de tema", icon: <CheckCircle className="h-5 w-5 text-green-500 mr-2 shrink-0 mt-0.5" /> },
      { text: "Acesso a novas features em primeira mão", icon: <CheckCircle className="h-5 w-5 text-green-500 mr-2 shrink-0 mt-0.5" /> },
    ],
    buttonText: "Seja VIP",
    variant: "default",
  },
  {
    name: "Apoiador Patrocinador" as TierName,
    price: "R$50",
    priceSuffix: "/mês",
    priceId: 50,
    description: "Para visionários que acreditam no potencial máximo do Zispr.",
    features: [
      { text: "Selo de verificação Ouro", icon: <BadgeCheck className="h-5 w-5 text-yellow-400 mr-2 shrink-0 mt-0.5" /> },
      { text: "Experiência sem anúncios", icon: <CheckCircle className="h-5 w-5 text-green-500 mr-2 shrink-0 mt-0.5" /> },
      { text: "Acesso ao Clube de Patrocinadores", icon: <CheckCircle className="h-5 w-5 text-green-500 mr-2 shrink-0 mt-0.5" /> },
      { text: "Maior visibilidade para seus posts", icon: <CheckCircle className="h-5 w-5 text-green-500 mr-2 shrink-0 mt-0.5" /> },
      { text: "Acesso a testes beta", icon: <CheckCircle className="h-5 w-5 text-green-500 mr-2 shrink-0 mt-0.5" /> },
      { text: "Estatísticas avançadas do perfil", icon: <CheckCircle className="h-5 w-5 text-green-500 mr-2 shrink-0 mt-0.5" /> },
    ],
    buttonText: "Patrocinar",
    variant: "secondary",
  }
];

export default function SupporterPage() {
  const { user } = useAuth();
  const router = useRouter();
  const { toast } = useToast();
  const [isLoading, setIsLoading] = useState<TierName | null>(null);

  const handlePayment = async (tier: typeof tiers[0]) => {
    if (!user) {
        router.push('/login?redirect=/supporter');
        return;
    }

    setIsLoading(tier.name);

    try {
      const response = await fetch('/api/create-payment', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          title: tier.name,
          price: tier.priceId,
          userId: user.uid
        }),
      });

      if (!response.ok) {
        throw new Error('Falha ao criar o link de pagamento.');
      }

      const { init_point } = await response.json();
      window.location.href = init_point;

    } catch (error) {
      console.error(error);
      toast({
        title: "Erro ao processar pagamento",
        description: "Não foi possível iniciar o checkout. Por favor, tente novamente.",
        variant: "destructive",
      });
      setIsLoading(null);
    }
  };

  return (
    <div className="flex flex-col items-center p-4 md:p-8 animate-fade-in bg-background">
      <div className="text-center mb-8">
        <HandHeart className="mx-auto h-16 w-16 text-primary mb-4" />
        <h1 className="text-4xl font-bold tracking-tight">Seja um Apoiador do Zispr</h1>
        <p className="mt-2 text-lg text-muted-foreground max-w-2xl">
          Sua contribuição é fundamental para manter a plataforma funcionando, crescendo e livre de grandes corporações. Escolha um plano e ganhe benefícios exclusivos!
        </p>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-8 w-full max-w-6xl">
        {tiers.map((tier) => (
          <Card key={tier.name} className={`flex flex-col ${tier.variant === 'default' ? 'border-primary ring-2 ring-primary shadow-lg' : ''}`}>
            <CardHeader className="text-center">
              <CardTitle className="text-2xl">{tier.name}</CardTitle>
              <CardDescription>{tier.description}</CardDescription>
            </CardHeader>
            <CardContent className="flex-1 space-y-6">
              <div className="text-center">
                <p className="flex justify-center items-baseline">
                    <span className="text-4xl font-bold">{tier.price}</span>
                    <span className="text-xl font-medium text-muted-foreground">{tier.priceSuffix}</span>
                </p>
              </div>
              <ul className="space-y-3 text-sm">
                {tier.features.map((feature) => (
                  <li key={feature.text} className="flex items-start">
                    {feature.icon}
                    <span>{feature.text}</span>
                  </li>
                ))}
              </ul>
            </CardContent>
            <CardFooter>
              <Button 
                className="w-full" 
                variant={tier.variant as "default" | "secondary"} 
                onClick={() => handlePayment(tier)}
                disabled={!!isLoading}
              >
                {isLoading === tier.name ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : tier.buttonText}
              </Button>
            </CardFooter>
          </Card>
        ))}
      </div>
       <p className="mt-8 text-xs text-muted-foreground text-center max-w-md">
        O pagamento é processado de forma segura pelo Mercado Pago. Você pode cancelar sua assinatura a qualquer momento.
      </p>
    </div>
  );
}


'use client';

import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Card, CardHeader, CardTitle, CardDescription, CardContent, CardFooter } from "@/components/ui/card";
import { useToast } from "@/hooks/use-toast";
import { BadgeCheck, CheckCircle, HandHeart, Loader2, ArrowLeft } from "lucide-react";
import { useAuth } from "@/hooks/use-auth";
import { useRouter } from "next/navigation";
import { getStripe } from "@/lib/stripe/client";


type TierName = "Apoiador Básico" | "Apoiador VIP" | "Apoiador Patrocinador";

const tiers = [
  {
    name: "Apoiador Básico" as TierName,
    priceId: process.env.NEXT_PUBLIC_STRIPE_BASIC_PRICE_ID,
    price: "5",
    priceSuffix: "/mês",
    description: "Para quem quer dar o primeiro passo e ajudar a plataforma a crescer.",
    features: [
      { text: "Selo de verificação Bronze", icon: <BadgeCheck className="h-5 w-5 text-amber-600 mr-2 shrink-0 mt-0.5" /> },
    ],
    buttonText: "Apoiar",
    variant: "secondary",
  },
  {
    name: "Apoiador VIP" as TierName,
    priceId: process.env.NEXT_PUBLIC_STRIPE_VIP_PRICE_ID,
    price: "20",
    priceSuffix: "/mês",
    description: "Para os entusiastas que desejam uma experiência aprimorada e acesso antecipado.",
    features: [
      { text: "Selo de verificação Prata", icon: <BadgeCheck className="h-5 w-5 text-slate-400 mr-2 shrink-0 mt-0.5" /> },
      { text: "Opções avançadas de tema", icon: <CheckCircle className="h-5 w-5 text-green-500 mr-2 shrink-0 mt-0.5" /> },
      { text: "Acesso a novas features em primeira mão", icon: <CheckCircle className="h-5 w-5 text-green-500 mr-2 shrink-0 mt-0.5" /> },
    ],
    buttonText: "Apoiar",
    variant: "default",
  },
  {
    name: "Apoiador Patrocinador" as TierName,
    priceId: process.env.NEXT_PUBLIC_STRIPE_SPONSOR_PRICE_ID,
    price: "50",
    priceSuffix: "/mês",
    description: "Para visionários que acreditam no potencial máximo do Zispr.",
    features: [
      { text: "Selo de verificação Ouro", icon: <BadgeCheck className="h-5 w-5 text-yellow-400 mr-2 shrink-0 mt-0.5" /> },
      { text: "Experiência sem anúncios", icon: <CheckCircle className="h-5 w-5 text-green-500 mr-2 shrink-0 mt-0.5" /> },
      { text: "Acesso ao Clube de Patrocinadores", icon: <CheckCircle className="h-5 w-5 text-green-500 mr-2 shrink-0 mt-0.5" /> },
      { text: "Maior visibilidade para seus posts", icon: <CheckCircle className="h-5 w-5 text-green-500 mr-2 shrink-0 mt-0.5" /> },
      { text: "Acesso a testes beta", icon: <CheckCircle className="h-5 w-5 text-green-500 mr-2 shrink-0 mt-0.5" /> },
      { text: "Estatísticas avançadas do perfil", icon: <CheckCircle className="h-5 w-5 text-green-500 mr-2 shrink-0 mt-0.5" /> },
    ],
    buttonText: "Apoiar",
    variant: "secondary",
  }
];

export default function SupporterPage() {
  const { user } = useAuth();
  const router = useRouter();
  const { toast } = useToast();
  const [isLoading, setIsLoading] = useState<string | null>(null);

  const handleCheckout = async (tier: typeof tiers[0]) => {
    if (!user) {
      toast({ title: "Você precisa estar logado para apoiar.", variant: "destructive" });
      router.push("/login");
      return;
    }
    
    setIsLoading(tier.name);

    try {
      const response = await fetch('/api/checkout/sessions', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          priceId: tier.priceId,
          userId: user.uid,
          userEmail: user.email,
          tier: tier.name
        }),
      });

      const { sessionId, error } = await response.json();

      if (error) {
        throw new Error(error.message);
      }
      
      const stripe = await getStripe();
      if (!stripe) {
          throw new Error('Stripe.js has not loaded yet.');
      }
      const { error: stripeError } = await stripe.redirectToCheckout({ sessionId });

      if (stripeError) {
          throw stripeError;
      }

    } catch (error: any) {
        toast({
            title: "Erro no Checkout",
            description: error.message || "Não foi possível iniciar o processo de pagamento. Por favor, tente novamente.",
            variant: "destructive",
        });
        console.error("Stripe checkout error:", error);
    } finally {
        setIsLoading(null);
    }
  };
  
  return (
    <>
      <header className="sticky top-0 z-10 bg-background/80 backdrop-blur-sm border-b">
        <div className="flex items-center gap-4 px-4 py-2">
            <Button variant="ghost" size="icon" onClick={() => router.back()}>
                <ArrowLeft className="h-5 w-5" />
            </Button>
            <h1 className="text-xl font-bold">Seja um Apoiador</h1>
        </div>
      </header>
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
                      <span className="text-4xl font-bold">R${tier.price}</span>
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
                  disabled={!!isLoading || !tier.priceId}
                  onClick={() => handleCheckout(tier)}
                >
                  {isLoading === tier.name ? (
                    <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                  ) : (
                    tier.buttonText
                  )}
                </Button>
              </CardFooter>
            </Card>
          ))}
        </div>
      </div>
    </>
  );
}

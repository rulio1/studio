
'use client';

import { Button } from "@/components/ui/button";
import { Card, CardHeader, CardTitle, CardDescription, CardContent, CardFooter } from "@/components/ui/card";
import { BadgeCheck, CheckCircle, HandHeart } from "lucide-react";

const tiers = [
  {
    name: "Apoiador Básico",
    price: "R$5",
    priceSuffix: "/mês",
    description: "Para quem quer dar o primeiro passo e ajudar a plataforma a crescer.",
    features: [
      { text: "Selo de verificação", icon: <BadgeCheck className="h-5 w-5 text-amber-600 mr-2 shrink-0 mt-0.5" /> },
    ],
    buttonText: "Apoiar",
    variant: "secondary",
  },
  {
    name: "Apoiador VIP",
    price: "R$20",
    priceSuffix: "/mês",
    description: "Para os entusiastas que desejam uma experiência aprimorada e acesso antecipado.",
    features: [
      { text: "Selo de verificação", icon: <BadgeCheck className="h-5 w-5 text-slate-400 mr-2 shrink-0 mt-0.5" /> },
      { text: "Opções avançadas de tema", icon: <CheckCircle className="h-5 w-5 text-green-500 mr-2 shrink-0 mt-0.5" /> },
      { text: "Acesso a novas features em primeira mão", icon: <CheckCircle className="h-5 w-5 text-green-500 mr-2 shrink-0 mt-0.5" /> },
    ],
    buttonText: "Seja VIP",
    variant: "default",
  },
  {
    name: "Apoiador Patrocinador",
    price: "R$50",
    priceSuffix: "/mês",
    description: "Para visionários que acreditam no potencial máximo do Zispr.",
    features: [
      { text: "Selo de verificação", icon: <BadgeCheck className="h-5 w-5 text-yellow-400 mr-2 shrink-0 mt-0.5" /> },
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
              <Button className="w-full" variant={tier.variant as "default" | "secondary"}>{tier.buttonText}</Button>
            </CardFooter>
          </Card>
        ))}
      </div>
       <p className="mt-8 text-xs text-muted-foreground text-center max-w-md">
        O pagamento é processado de forma segura. Você pode cancelar sua assinatura a qualquer momento. Para mais informações, consulte nossos Termos de Serviço.
      </p>
    </div>
  );
}

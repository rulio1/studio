
'use client';

import { Button } from "@/components/ui/button";
import { Card, CardHeader, CardTitle, CardDescription, CardContent, CardFooter } from "@/components/ui/card";
import { Check, CheckCircle, HandHeart } from "lucide-react";

const tiers = [
  {
    name: "Apoiador Básico",
    price: "R$ 5",
    priceSuffix: "/mês",
    description: "Para quem quer dar o primeiro passo e ajudar a plataforma a crescer.",
    features: [
      "Selo de verificação na cor bronze",
    ],
    buttonText: "Apoiar",
    variant: "secondary",
  },
  {
    name: "Apoiador VIP",
    price: "R$ 20",
    priceSuffix: "/mês",
    description: "Para os entusiastas que desejam uma experiência aprimorada e acesso antecipado.",
    features: [
      "Selo de verificação na cor prata",
      "Opções avançadas de tema",
      "Acesso a novas features em primeira mão",
    ],
    buttonText: "Seja VIP",
    variant: "default",
  },
  {
    name: "Apoiador Patrocinador",
    price: "R$ 50",
    priceSuffix: "/mês",
    description: "Para visionários que acreditam no potencial máximo do Zispr.",
    features: [
      "Selo de verificação na cor ouro",
      "Experiência sem anúncios",
      "Acesso ao Clube de Patrocinadores",
      "Maior visibilidade para seus posts",
      "Acesso a testes beta",
      "Estatísticas avançadas do perfil",
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
                <span className="text-4xl font-bold">{tier.price}</span>
                <span className="text-muted-foreground">{tier.priceSuffix}</span>
              </div>
              <ul className="space-y-3 text-sm">
                {tier.features.map((feature) => (
                  <li key={feature} className="flex items-start">
                    <CheckCircle className="h-5 w-5 text-green-500 mr-2 shrink-0 mt-0.5" />
                    <span>{feature}</span>
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

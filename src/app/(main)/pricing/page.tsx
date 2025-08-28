
'use client';

import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from '@/components/ui/card';
import { useToast } from '@/hooks/use-toast';
import { cn } from '@/lib/utils';
import { Check } from 'lucide-react';

const plans = [
    {
        name: 'Grátis',
        price: 'R$0',
        description: 'Perfeito para começar sua jornada no Zispr.',
        features: [
            'Postagens ilimitadas',
            'Mensagens diretas',
            'Criar comunidades',
            'Acesso ao Zispr AI'
        ],
        cta: 'Seu Plano Atual',
        isCurrent: true,
    },
    {
        name: 'Pro',
        price: 'R$19/mês',
        description: 'Para criadores de conteúdo e usuários avançados.',
        features: [
            'Tudo do plano Grátis',
            'Selo de Verificado',
            'Análises avançadas de posts',
            'Edição de posts por mais tempo',
            'Suporte prioritário'
        ],
        cta: 'Fazer Upgrade',
        isCurrent: false,
        isPopular: true,
    },
    {
        name: 'Business',
        price: 'R$49/mês',
        description: 'Para marcas e empresas que buscam mais alcance.',
        features: [
            'Tudo do plano Pro',
            'Ferramentas de agendamento de posts',
            'Análises de perfil aprofundadas',
            'API de integração',
            'Gerente de conta dedicado'
        ],
        cta: 'Fazer Upgrade',
        isCurrent: false,
    }
];

export default function PricingPage() {
    const { toast } = useToast();

    const handleUpgradeClick = (planName: string) => {
        toast({
            title: `Upgrade para o plano ${planName}`,
            description: 'A integração de pagamento será implementada em breve. Obrigado pelo seu interesse!',
        });
    };
    
    return (
        <div className="flex-1 animate-fade-in p-4 md:p-8">
            <div className="max-w-5xl mx-auto">
                <div className="text-center mb-12">
                    <h1 className="text-4xl font-extrabold tracking-tight lg:text-5xl">Nossos Planos</h1>
                    <p className="mt-4 text-lg text-muted-foreground">
                        Escolha o plano que melhor se adapta às suas necessidades no Zispr.
                    </p>
                </div>

                <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
                    {plans.map((plan) => (
                        <Card key={plan.name} className={cn(
                            "flex flex-col rounded-2xl",
                            plan.isPopular && "border-primary shadow-lg"
                        )}>
                            <CardHeader className="text-center">
                                <CardTitle className="text-2xl">{plan.name}</CardTitle>
                                <CardDescription>{plan.description}</CardDescription>
                            </CardHeader>
                            <CardContent className="flex-1">
                                <div className="text-center mb-6">
                                    <span className="text-4xl font-bold">{plan.price.split('/')[0]}</span>
                                    <span className="text-muted-foreground">/mês</span>
                                </div>
                                <ul className="space-y-4">
                                    {plan.features.map((feature, index) => (
                                        <li key={index} className="flex items-center gap-3">
                                            <Check className="h-5 w-5 text-green-500" />
                                            <span>{feature}</span>
                                        </li>
                                    ))}
                                </ul>
                            </CardContent>
                            <CardFooter>
                                <Button 
                                    className="w-full rounded-full" 
                                    variant={plan.isPopular ? 'default' : 'outline'}
                                    disabled={plan.isCurrent}
                                    onClick={() => handleUpgradeClick(plan.name)}
                                >
                                    {plan.cta}
                                </Button>
                            </CardFooter>
                        </Card>
                    ))}
                </div>
            </div>
        </div>
    );
}


'use client';

import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from '@/components/ui/card';
import { useToast } from '@/hooks/use-toast';
import { cn } from '@/lib/utils';
import { Check, Loader2 } from 'lucide-react';
import { useState } from 'react';
import { useAuth } from '@/hooks/use-auth';
import { loadStripe } from '@stripe/stripe-js';
import { createCheckoutSession } from '@/actions/stripe';

const stripePromise = loadStripe(process.env.NEXT_PUBLIC_STRIPE_PUBLISHABLE_KEY!);

const plans = [
    {
        id: 'free',
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
        id: 'pro',
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
        id: 'business',
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
    const { user } = useAuth();
    const [loadingPlan, setLoadingPlan] = useState<string | null>(null);

    const handleUpgradeClick = async (planId: string) => {
        if (!user) {
            toast({
                title: "Você não está logado",
                description: "Por favor, faça login para fazer o upgrade do seu plano.",
                variant: "destructive",
            });
            return;
        }

        if (planId === 'free') return;

        setLoadingPlan(planId);

        try {
            const { sessionId, error } = await createCheckoutSession(planId, user.uid);

            if (error) {
                throw new Error(error);
            }
            
            if (!sessionId) {
                throw new Error('Não foi possível obter o ID da sessão de checkout.');
            }

            const stripe = await stripePromise;
            if (!stripe) {
                throw new Error("Stripe.js não carregou.");
            }

            const { error: stripeError } = await stripe.redirectToCheckout({ sessionId });

            if (stripeError) {
                throw new Error(stripeError.message);
            }

        } catch (error: any) {
            toast({
                title: 'Erro no Checkout',
                description: error.message || 'Não foi possível iniciar a sessão de pagamento. Tente novamente.',
                variant: 'destructive',
            });
        } finally {
            setLoadingPlan(null);
        }
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
                                    disabled={plan.isCurrent || !!loadingPlan}
                                    onClick={() => handleUpgradeClick(plan.id)}
                                >
                                    {loadingPlan === plan.id ? (
                                        <Loader2 className="h-5 w-5 animate-spin"/>
                                    ) : (
                                        plan.cta
                                    )}
                                </Button>
                            </CardFooter>
                        </Card>
                    ))}
                </div>
            </div>
        </div>
    );
}

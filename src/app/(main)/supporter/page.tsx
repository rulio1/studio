
'use client';

import { Button } from "@/components/ui/button";
import { Card, CardHeader, CardTitle, CardDescription, CardContent } from "@/components/ui/card";
import { HandHeart, ArrowLeft, BadgeCheck, CheckCircle } from "lucide-react";
import { useRouter } from "next/navigation";
import { useTranslation } from "@/hooks/use-translation";

export default function SupporterPage() {
  const router = useRouter();
  const { t } = useTranslation();

  const tiers = [
    {
      name: t('supporter.tiers.basic.name'),
      price: t('supporter.tiers.priceSoon'),
      description: t('supporter.tiers.basic.description'),
      features: [
        { text: t('supporter.tiers.basic.features.0'), icon: <BadgeCheck className="h-5 w-5 text-amber-600 mr-2 shrink-0 mt-0.5" /> },
      ],
      variant: "secondary",
    },
    {
      name: t('supporter.tiers.vip.name'),
      price: t('supporter.tiers.priceSoon'),
      description: t('supporter.tiers.vip.description'),
      features: [
        { text: t('supporter.tiers.vip.features.0'), icon: <BadgeCheck className="h-5 w-5 text-slate-400 mr-2 shrink-0 mt-0.5" /> },
        { text: t('supporter.tiers.vip.features.1'), icon: <CheckCircle className="h-5 w-5 text-green-500 mr-2 shrink-0 mt-0.5" /> },
        { text: t('supporter.tiers.vip.features.2'), icon: <CheckCircle className="h-5 w-5 text-green-500 mr-2 shrink-0 mt-0.5" /> },
      ],
      variant: "default",
    },
    {
      name: t('supporter.tiers.patron.name'),
      price: t('supporter.tiers.priceSoon'),
      description: t('supporter.tiers.patron.description'),
      features: [
        { text: t('supporter.tiers.patron.features.0'), icon: <BadgeCheck className="h-5 w-5 text-yellow-400 mr-2 shrink-0 mt-0.5" /> },
        { text: t('supporter.tiers.patron.features.1'), icon: <CheckCircle className="h-5 w-5 text-green-500 mr-2 shrink-0 mt-0.5" /> },
        { text: t('supporter.tiers.patron.features.2'), icon: <CheckCircle className="h-5 w-5 text-green-500 mr-2 shrink-0 mt-0.5" /> },
      ],
      variant: "secondary",
    }
  ];
  
  return (
    <>
      <header className="sticky top-0 z-10 bg-background/80 backdrop-blur-sm border-b">
        <div className="flex items-center gap-4 px-4 py-2">
            <Button variant="ghost" size="icon" onClick={() => router.back()}>
                <ArrowLeft className="h-5 w-5" />
            </Button>
            <h1 className="text-xl font-bold">{t('supporter.title')}</h1>
        </div>
      </header>
      <div className="flex flex-col items-center p-4 md:p-8 animate-fade-in bg-background">
        <div className="text-center mb-8">
          <HandHeart className="mx-auto h-16 w-16 text-primary mb-4" />
          <h1 className="text-4xl font-bold tracking-tight">{t('supporter.pageTitle')}</h1>
          <p className="mt-2 text-lg text-muted-foreground max-w-2xl">
            {t('supporter.pageDescription')}
          </p>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-8 w-full max-w-6xl">
          {tiers.map((tier) => (
            <Card key={tier.name} className={`flex flex-col ${tier.variant === 'default' ? 'border-primary/50' : ''}`}>
              <CardHeader className="text-center">
                <CardTitle className="text-2xl">{tier.name}</CardTitle>
                <CardDescription>{tier.description}</CardDescription>
              </CardHeader>
              <CardContent className="flex-1 space-y-6">
                <div className="text-center">
                  <p className="flex justify-center items-baseline">
                      <span className="text-4xl font-bold">{tier.price}</span>
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
            </Card>
          ))}
        </div>
      </div>
    </>
  );
}

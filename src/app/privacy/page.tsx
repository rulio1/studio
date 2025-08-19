
'use client';

import { Button } from '@/components/ui/button';
import { ArrowLeft } from 'lucide-react';
import { useRouter } from 'next/navigation';

export default function PrivacyPolicyPage() {
    const router = useRouter();

    return (
        <div className="bg-background text-foreground min-h-screen">
             <header className="sticky top-0 z-10 bg-background/80 backdrop-blur-sm border-b">
                <div className="flex items-center gap-4 px-4 py-2">
                    <Button variant="ghost" size="icon" onClick={() => router.back()}>
                        <ArrowLeft className="h-5 w-5" />
                    </Button>
                    <h1 className="text-xl font-bold">Política de Privacidade</h1>
                </div>
            </header>
            <main className="p-6 prose prose-invert max-w-4xl mx-auto">
                <h2 className="font-bold text-2xl mt-4">Política de Privacidade do Zispr</h2>
                <p className="text-muted-foreground">Última atualização: 19 de Agosto de 2024</p>

                <p>
                    Bem-vindo à Política de Privacidade do Zispr. Nós valorizamos sua privacidade e a segurança das suas informações. Esta política descreve como coletamos, usamos, processamos e divulgamos suas informações, incluindo dados pessoais, em conjunto com seu acesso e uso da plataforma Zispr.
                </p>

                <h3 className="font-bold text-xl mt-6">1. Informações que Coletamos</h3>
                <p>
                    Existem três categorias gerais de informações que coletamos.
                </p>
                <ul className="list-disc pl-6 space-y-2 mt-2">
                    <li>
                        <strong>Informações que você nos fornece:</strong> Coletamos informações que você compartilha conosco quando usa o Zispr. Isso inclui informações de perfil como seu nome, e-mail, data de nascimento e foto do perfil. Também coletamos o conteúdo que você cria, como posts, comentários e mensagens.
                    </li>
                    <li>
                        <strong>Informações de Uso:</strong> Coletamos informações sobre suas interações com o Zispr, como as páginas ou conteúdos que você visualiza, suas buscas, as comunidades que você participa e outras ações na plataforma.
                    </li>
                    <li>
                        <strong>Dados de Log e Dispositivo:</strong> Coletamos automaticamente dados de log e informações do dispositivo quando você acessa e usa o Zispr, mesmo que você não tenha criado uma conta ou feito login.
                    </li>
                </ul>

                <h3 className="font-bold text-xl mt-6">2. Como Usamos as Informações que Coletamos</h3>
                <p>
                    Usamos, armazenamos e processamos informações, incluindo informações pessoais, sobre você para fornecer, entender, melhorar e desenvolver o Zispr, criar e manter um ambiente confiável e seguro e cumprir com nossas obrigações legais.
                </p>

                 <h3 className="font-bold text-xl mt-6">3. Compartilhamento e Divulgação</h3>
                <p>
                    Não compartilhamos suas informações pessoais com empresas, organizações ou indivíduos externos ao Zispr, exceto nos seguintes casos: com seu consentimento, para processamento externo por nossos afiliados ou outros negócios ou pessoas confiáveis, ou por razões legais.
                </p>
                
                <h3 className="font-bold text-xl mt-6">4. Seus Direitos</h3>
                <p>
                    Você pode exercer qualquer um dos direitos descritos nesta seção entrando em contato conosco. Por favor, note que podemos pedir que você verifique sua identidade antes de tomar outras medidas sobre sua solicitação. Você tem o direito de acessar e atualizar algumas de suas informações através das configurações da sua Conta.
                </p>

                 <h3 className="font-bold text-xl mt-6">5. Segurança</h3>
                <p>
                    Estamos continuamente implementando e atualizando medidas de segurança administrativas, técnicas e físicas para ajudar a proteger suas informações contra acesso não autorizado, perda, destruição ou alteração.
                </p>

                 <h3 className="font-bold text-xl mt-6">6. Alterações a esta Política de Privacidade</h3>
                <p>
                    O Zispr reserva-se o direito de modificar esta Política de Privacidade a qualquer momento, de acordo com esta provisão. Se fizermos alterações a esta Política de Privacidade, publicaremos a política revisada no Zispr e atualizaremos a data da “Última atualização” no topo.
                </p>

                 <h3 className="font-bold text-xl mt-6">7. Contato</h3>
                <p>
                    Se você tiver alguma dúvida ou reclamação sobre esta Política de Privacidade ou sobre as práticas de tratamento de informações do Zispr, pode nos enviar um e-mail para <a href="mailto:privacy@zispr.com" className="text-primary hover:underline">privacy@zispr.com</a>.
                </p>
            </main>
        </div>
    );
}

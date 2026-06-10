import { createFileRoute } from "@tanstack/react-router";
import { type LucideIcon, Construction } from "lucide-react";
import * as Icons from "lucide-react";

function PlaceholderPage({ title, subtitle, icon: Icon }: { title: string; subtitle: string; icon: LucideIcon }) {
  return (
    <div className="p-8 lg:p-12 min-h-screen">
      <div className="max-w-4xl">
        <div className="flex items-center gap-4 mb-3">
          <div className="size-14 rounded-2xl bg-gradient-to-br from-gold to-gold-soft flex items-center justify-center text-primary-foreground">
            <Icon className="size-7" />
          </div>
          <div>
            <h1 className="font-display text-4xl">{title}</h1>
            <p className="text-muted-foreground">{subtitle}</p>
          </div>
        </div>
        <div className="mt-10 rounded-2xl glass p-10 text-center">
          <Construction className="size-12 mx-auto text-gold mb-3" />
          <h2 className="font-display text-2xl mb-2">Módulo en construcción</h2>
          <p className="text-muted-foreground max-w-md mx-auto">
            Este módulo está listo para conectarse con la base de datos. La estructura visual y de navegación
            ya forma parte del sistema — la lógica completa se habilitará al activar Lovable Cloud.
          </p>
        </div>
      </div>
    </div>
  );
}

export const make = (route: string, title: string, subtitle: string, iconName: keyof typeof Icons) => {
  const Icon = Icons[iconName] as LucideIcon;
  return createFileRoute(route as never)({
    component: () => <PlaceholderPage title={title} subtitle={subtitle} icon={Icon} />,
  });
};

export { PlaceholderPage };

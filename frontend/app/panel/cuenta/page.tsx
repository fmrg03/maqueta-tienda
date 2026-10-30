import { CambiarPassword } from "@/components/panel/cuenta/CambiarPassword";

export default function PaginaCuenta() {
  return (
    <div>
      <h1 className="font-serif text-[26px] font-semibold">Mi cuenta</h1>
      <div className="my-3.5 h-0.5 w-12 bg-gradient-to-r from-dorado-claro to-dorado-oscuro" />
      <h2 className="mb-3 font-serif text-lg font-semibold">Cambiar contraseña</h2>
      <CambiarPassword />
    </div>
  );
}

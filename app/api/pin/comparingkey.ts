import bcrypt from "bcryptjs";

async function main() {
    const pinDigitado = "874531";
    const hash ="$2a$10$VowoyBj0a7aGqSBqOO.axOGZyKyR8sQDfhkdiLzVkpEjWZxA/WXiO";

    if (!hash) throw new Error("PIN_HASH não está definido");

    const ok = await bcrypt.compare(pinDigitado, hash);
    console.log("PIN válido?", ok);
}

main().catch(console.error);

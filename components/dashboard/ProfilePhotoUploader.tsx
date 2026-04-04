"use client";

import { ChangeEvent, useMemo, useState } from "react";
import { useRouter } from "next/navigation";
import { Camera, Trash2, Upload } from "lucide-react";
import Button from "@/components/ui/Button";
import { getInitials } from "@/lib/utils";

type ProfilePhotoUploaderProps = {
    initialImage: string | null;
    displayName: string;
};

type ProfilePhotoResponse = {
    success?: boolean;
    message?: string;
    error?: string;
    data?: {
        imageUrl?: string | null;
    };
};

export default function ProfilePhotoUploader({
    initialImage,
    displayName,
}: ProfilePhotoUploaderProps) {
    const router = useRouter();
    const [currentImage, setCurrentImage] = useState<string | null>(initialImage);
    const [selectedFile, setSelectedFile] = useState<File | null>(null);
    const [previewImage, setPreviewImage] = useState<string | null>(initialImage);
    const [uploading, setUploading] = useState(false);
    const [removing, setRemoving] = useState(false);
    const [error, setError] = useState("");
    const [success, setSuccess] = useState("");

    const initials = useMemo(() => getInitials(displayName || "User"), [displayName]);

    function handleFileChange(event: ChangeEvent<HTMLInputElement>) {
        const file = event.target.files?.[0];
        if (!file) {
            return;
        }

        setError("");
        setSuccess("");
        setSelectedFile(file);

        const fileReader = new FileReader();
        fileReader.onload = (readerEvent) => {
            const result = readerEvent.target?.result;
            setPreviewImage(typeof result === "string" ? result : null);
        };
        fileReader.readAsDataURL(file);
    }

    async function handleUpload() {
        if (!selectedFile) {
            setError("Pilih file gambar terlebih dahulu.");
            return;
        }

        setUploading(true);
        setError("");
        setSuccess("");

        try {
            const formData = new FormData();
            formData.append("file", selectedFile);

            const response = await fetch("/api/auth/profile-photo", {
                method: "POST",
                body: formData,
            });

            let data: ProfilePhotoResponse | null = null;
            try {
                data = (await response.json()) as ProfilePhotoResponse;
            } catch {
                data = null;
            }

            if (!response.ok || !data?.success) {
                setError(data?.error || `Gagal upload foto profil (HTTP ${response.status}).`);
                return;
            }

            const nextImage = data?.data?.imageUrl ?? null;
            setCurrentImage(nextImage);
            setPreviewImage(nextImage);
            setSelectedFile(null);
            setSuccess(data.message || "Foto profil berhasil diperbarui.");
            router.refresh();
        } catch {
            setError("Terjadi kesalahan jaringan. Silakan coba lagi.");
        } finally {
            setUploading(false);
        }
    }

    async function handleRemove() {
        if (!currentImage) {
            return;
        }

        setRemoving(true);
        setError("");
        setSuccess("");

        try {
            const response = await fetch("/api/auth/profile-photo", {
                method: "DELETE",
            });

            let data: ProfilePhotoResponse | null = null;
            try {
                data = (await response.json()) as ProfilePhotoResponse;
            } catch {
                data = null;
            }

            if (!response.ok || !data?.success) {
                setError(data?.error || `Gagal hapus foto profil (HTTP ${response.status}).`);
                return;
            }

            setCurrentImage(null);
            setPreviewImage(null);
            setSelectedFile(null);
            setSuccess(data.message || "Foto profil berhasil dihapus.");
            router.refresh();
        } catch {
            setError("Terjadi kesalahan jaringan. Silakan coba lagi.");
        } finally {
            setRemoving(false);
        }
    }

    const shownImage = previewImage || currentImage;

    return (
        <div className="space-y-3">
            <div className="w-28 h-28 border-2 border-nb-black bg-nb-yellow overflow-hidden flex items-center justify-center">
                {shownImage ? (
                    // eslint-disable-next-line @next/next/no-img-element
                    <img
                        src={shownImage}
                        alt={`Foto profil ${displayName}`}
                        className="w-full h-full object-cover"
                    />
                ) : (
                    <span className="font-heading text-3xl text-nb-black">{initials}</span>
                )}
            </div>

            <input
                id="profile-photo-input"
                type="file"
                accept="image/*"
                onChange={handleFileChange}
                className="font-mono text-xs"
            />

            <div className="flex flex-wrap gap-2">
                <Button
                    variant="black"
                    size="sm"
                    icon={<Upload size={14} />}
                    loading={uploading}
                    onClick={handleUpload}
                    disabled={!selectedFile}
                >
                    Upload Foto
                </Button>

                <Button
                    variant="white"
                    size="sm"
                    icon={<Trash2 size={14} />}
                    loading={removing}
                    onClick={handleRemove}
                    disabled={!currentImage}
                >
                    Hapus
                </Button>
            </div>

            <p className="font-mono text-xs text-nb-gray">
                <Camera size={12} className="inline-block mr-1" />
                Format gambar bebas, maksimal 3MB.
            </p>

            {error && (
                <div
                    className="p-3 font-mono text-xs font-bold text-white"
                    style={{
                        backgroundColor: "#FF3B3B",
                        border: "2px solid #0D0D0D",
                    }}
                >
                    ⚠ {error}
                </div>
            )}

            {success && (
                <div
                    className="p-3 font-mono text-xs font-bold"
                    style={{
                        backgroundColor: "#00C853",
                        border: "2px solid #0D0D0D",
                        color: "#0D0D0D",
                    }}
                >
                    ✓ {success}
                </div>
            )}
        </div>
    );
}

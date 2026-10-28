import React, { useState, useEffect, useRef } from 'react';
import {
  Camera,
  ArrowDownLeft,
  ArrowUpRight,
  CheckCircle2,
  AlertTriangle,
  RefreshCw,
  Clock,
  ShieldAlert,
  ShieldCheck,
  Upload,
  FileEdit,
  QrCode,
  CreditCard,
  Banknote,
  Scan,
  Video,
  VideoOff,
  Search,
  Check
} from 'lucide-react';
import { api } from '../services/api';

export default function GateControl({ 
  onTransactionSuccess, 
  availableSlots = [], 
  parkedVehicles = [],
  activeTab = 'gate_in',
  setActiveTab
}) {
  // ================= CHẾ ĐỘ HIỂN THỊ CỔNG: 'in' HOẶC 'out' (KHÔNG SONG SONG) =================
  const [currentGate, setCurrentGate] = useState(() => {
    return activeTab === 'gate_out' ? 'out' : 'in';
  });

  useEffect(() => {
    if (activeTab === 'gate_out') setCurrentGate('out');
    else setCurrentGate('in');
  }, [activeTab]);

  const handleSwitchGate = (gate) => {
    setCurrentGate(gate);
    if (setActiveTab) {
      setActiveTab(gate === 'out' ? 'gate_out' : 'gate_in');
    }
  };

  // ================= CỔNG VÀO (GATE IN) STATE =================
  const [inPlate, setInPlate] = useState('');
  const [inVehicleType, setInVehicleType] = useState('O to');
  const [inSlot, setInSlot] = useState('');
  const [inAiConfidence, setInAiConfidence] = useState(null);
  const [inScanning, setInScanning] = useState(false);
  const [inImageFile, setInImageFile] = useState(null);
  const [inImagePreview, setInImagePreview] = useState(null);
  const [inBox, setInBox] = useState(null);
  const [inPlateCropBase64, setInPlateCropBase64] = useState(null);
  const [inEngine, setInEngine] = useState('YOLOv8 + OCR');
  const [inTimeMs, setInTimeMs] = useState(null);
  const [inMessage, setInMessage] = useState(null);
  const [inSubmitting, setInSubmitting] = useState(false);

  // ================= CỔNG RA (GATE OUT) STATE =================
  const [outPlate, setOutPlate] = useState('');
  const [outScanning, setOutScanning] = useState(false);
  const [outImageFile, setOutImageFile] = useState(null);
  const [outImagePreview, setOutImagePreview] = useState(null);
  const [outPaymentMethod, setOutPaymentMethod] = useState('QR_CODE');
  const [outFeeEstimate, setOutFeeEstimate] = useState(null);
  const [outMessage, setOutMessage] = useState(null);
  const [outSubmitting, setOutSubmitting] = useState(false);
  const [selectedParkedVehicle, setSelectedParkedVehicle] = useState(null);

  // ================= CAMERA (WEBCAM) STATE =================
  const inVideoRef = useRef(null);
  const inCanvasRef = useRef(null);
  const [inWebcamActive, setInWebcamActive] = useState(false);
  const [inStream, setInStream] = useState(null);

  const outVideoRef = useRef(null);
  const outCanvasRef = useRef(null);
  const [outWebcamActive, setOutWebcamActive] = useState(false);
  const [outStream, setOutStream] = useState(null);

  // Thiết bị Camera (Hỗ trợ Webcam máy tính & OBS Virtual Camera)
  const [videoDevices, setVideoDevices] = useState([]);
  const [selectedInDeviceId, setSelectedInDeviceId] = useState('');
  const [selectedOutDeviceId, setSelectedOutDeviceId] = useState('');

  const refreshVideoDevices = async () => {
    try {
      if (!navigator.mediaDevices?.enumerateDevices) return;
      const devices = await navigator.mediaDevices.enumerateDevices();
      const videoInputs = devices.filter(d => d.kind === 'videoinput');
      setVideoDevices(videoInputs);
      
      if (videoInputs.length > 0) {
        // Tự động ưu tiên OBS Virtual Camera nếu phát hiện, hoặc chọn camera đầu tiên
        const obsDevice = videoInputs.find(d => d.label.toLowerCase().includes('obs'));
        if (obsDevice) {
          if (!selectedInDeviceId) setSelectedInDeviceId(obsDevice.deviceId);
          if (!selectedOutDeviceId) setSelectedOutDeviceId(obsDevice.deviceId);
        } else {
          if (!selectedInDeviceId) setSelectedInDeviceId(videoInputs[0].deviceId);
          if (!selectedOutDeviceId) setSelectedOutDeviceId(videoInputs[0].deviceId);
        }
      }
    } catch (err) {
      console.warn('Không thể liệt kê danh sách camera:', err);
    }
  };

  useEffect(() => {
    refreshVideoDevices();
  }, []);

  // ================= GENERAL CONTROLS =================
  const [searchParkedTerm, setSearchParkedTerm] = useState('');

  useEffect(() => {
    return () => {
      if (inStream) inStream.getTracks().forEach(t => t.stop());
      if (outStream) outStream.getTracks().forEach(t => t.stop());
    };
  }, [inStream, outStream]);

  // ================= CAMERA LÀN VÀO =================
  const toggleInWebcam = async () => {
    if (inWebcamActive) {
      if (inStream) inStream.getTracks().forEach(t => t.stop());
      setInStream(null);
      setInWebcamActive(false);
    } else {
      try {
        const constraints = {
          video: selectedInDeviceId
            ? { deviceId: { exact: selectedInDeviceId } }
            : true
        };
        const mediaStream = await navigator.mediaDevices.getUserMedia(constraints);
        setInStream(mediaStream);
        setInWebcamActive(true);
        await refreshVideoDevices();
        setTimeout(() => {
          if (inVideoRef.current) {
            inVideoRef.current.srcObject = mediaStream;
            inVideoRef.current.play();
          }
        }, 100);
      } catch (err) {
        setInMessage({ type: 'error', text: 'Không thể truy cập camera hoặc OBS Virtual Camera!' });
      }
    }
  };

  const handleInCameraChange = async (deviceId) => {
    setSelectedInDeviceId(deviceId);
    if (inWebcamActive) {
      if (inStream) inStream.getTracks().forEach(t => t.stop());
      try {
        const mediaStream = await navigator.mediaDevices.getUserMedia({
          video: deviceId ? { deviceId: { exact: deviceId } } : true
        });
        setInStream(mediaStream);
        if (inVideoRef.current) {
          inVideoRef.current.srcObject = mediaStream;
          inVideoRef.current.play();
        }
      } catch (e) {
        console.error('Lỗi khi chuyển camera cổng vào:', e);
      }
    }
  };

  const captureInFrame = () => {
    if (!inVideoRef.current || !inCanvasRef.current) return;
    const video = inVideoRef.current;
    const canvas = inCanvasRef.current;
    canvas.width = video.videoWidth || 1280;
    canvas.height = video.videoHeight || 720;
    const ctx = canvas.getContext('2d');
    ctx.drawImage(video, 0, 0, canvas.width, canvas.height);
    
    canvas.toBlob((blob) => {
      const file = new File([blob], 'camera-in.jpg', { type: 'image/jpeg' });
      setInImageFile(file);
      setInImagePreview(URL.createObjectURL(blob));
      setInBox(null);
      setInPlateCropBase64(null);
      triggerInAiScan(file);
    }, 'image/jpeg', 0.95);
  };

  // ================= CAMERA LÀN RA =================
  const toggleOutWebcam = async () => {
    if (outWebcamActive) {
      if (outStream) outStream.getTracks().forEach(t => t.stop());
      setOutStream(null);
      setOutWebcamActive(false);
    } else {
      try {
        const constraints = {
          video: selectedOutDeviceId
            ? { deviceId: { exact: selectedOutDeviceId } }
            : true
        };
        const mediaStream = await navigator.mediaDevices.getUserMedia(constraints);
        setOutStream(mediaStream);
        setOutWebcamActive(true);
        await refreshVideoDevices();
        setTimeout(() => {
          if (outVideoRef.current) {
            outVideoRef.current.srcObject = mediaStream;
            outVideoRef.current.play();
          }
        }, 100);
      } catch (err) {
        setOutMessage({ type: 'error', text: 'Không thể truy cập camera hoặc OBS Virtual Camera!' });
      }
    }
  };

  const handleOutCameraChange = async (deviceId) => {
    setSelectedOutDeviceId(deviceId);
    if (outWebcamActive) {
      if (outStream) outStream.getTracks().forEach(t => t.stop());
      try {
        const mediaStream = await navigator.mediaDevices.getUserMedia({
          video: deviceId ? { deviceId: { exact: deviceId } } : true
        });
        setOutStream(mediaStream);
        if (outVideoRef.current) {
          outVideoRef.current.srcObject = mediaStream;
          outVideoRef.current.play();
        }
      } catch (e) {
        console.error('Lỗi khi chuyển camera cổng ra:', e);
      }
    }
  };

  const captureOutFrame = () => {
    if (!outVideoRef.current || !outCanvasRef.current) return;
    const video = outVideoRef.current;
    const canvas = outCanvasRef.current;
    canvas.width = video.videoWidth || 1280;
    canvas.height = video.videoHeight || 720;
    canvas.height = video.videoHeight;
    const ctx = canvas.getContext('2d');
    ctx.drawImage(video, 0, 0, canvas.width, canvas.height);
    
    canvas.toBlob((blob) => {
      const file = new File([blob], 'camera-out.jpg', { type: 'image/jpeg' });
      setOutImageFile(file);
      setOutImagePreview(URL.createObjectURL(blob));
      triggerOutAiScan(file);
    }, 'image/jpeg', 0.95);
  };

  // ================= DỮ LIỆU MẪU KIỂM THỬ (KHÔNG CHỨA ICON / EMOJI) =================
  const SAMPLE_VEHICLES = [
    {
      id: 'bike_12b1',
      title: 'Xe máy',
      plate: '12-B1 168.88',
      type: 'Xe may',
      badge: '2 dòng số',
      badgeClass: 'bg-emerald-50 text-emerald-700 border-emerald-200',
      imgUrl: '/uploads/plate-1790933101057-93459260.jpg'
    },
    {
      id: 'car_30h',
      title: 'Ô tô',
      plate: '30H-892.45',
      type: 'O to',
      badge: 'Thường trú',
      badgeClass: 'bg-blue-50 text-blue-700 border-blue-200',
      imgUrl: '/uploads/plate-1787582830275-878774211.jpg'
    },
    {
      id: 'car_51k',
      title: 'Ô tô VIP',
      plate: '51K-345.67',
      type: 'O to',
      badge: 'Cư dân',
      badgeClass: 'bg-purple-50 text-purple-700 border-purple-200',
      imgUrl: '/uploads/plate-1787583758275-659382424.jpg'
    },
    {
      id: 'uc15_test',
      title: 'Biển mờ',
      plate: 'Nhập tay',
      type: 'O to',
      badge: 'Kiểm tra',
      badgeClass: 'bg-amber-50 text-amber-700 border-amber-200',
      isLowConf: true
    }
  ];

  const handleLoadPreset = async (preset) => {
    if (preset.isLowConf) {
      setInImageFile(null);
      setInImagePreview(null);
      setInBox(null);
      setInPlateCropBase64(null);
      triggerInAiScan(null, true);
      return;
    }
    try {
      setInScanning(true);
      setInMessage(null);
      setInBox(null);
      setInPlateCropBase64(null);

      const res = await fetch(preset.imgUrl);
      const blob = await res.blob();
      const filename = preset.imgUrl.split('/').pop() || 'preset.jpg';
      const file = new File([blob], filename, { type: blob.type || 'image/jpeg' });

      setInImageFile(file);
      setInImagePreview(URL.createObjectURL(blob));

      await triggerInAiScan(file, false);
    } catch (err) {
      console.warn('Lỗi nạp mẫu xe:', err);
      triggerInAiScan(null, false);
    }
  };

  // ================= TÍNH CƯỚC THỰC TẾ CHO CỔNG RA =================
  useEffect(() => {
    if (!outPlate) {
      setOutFeeEstimate(null);
      setSelectedParkedVehicle(null);
      return;
    }

    const cleanPlate = outPlate.trim().toUpperCase();
    const found = parkedVehicles.find(v => v.bienSo?.toUpperCase() === cleanPlate || v.bienSoXe?.toUpperCase() === cleanPlate);

    if (found) {
      setSelectedParkedVehicle(found);
      const timeIn = new Date(found.thoiGianVao || Date.now());
      const now = new Date();
      const diffMs = Math.max(0, now - timeIn);
      const hours = Math.max(1, Math.ceil(diffMs / (1000 * 60 * 60)));
      const isBike = found.loaiXe === 'XE_MAY' || found.loaiXe === 'Xe may';
      const isResident = found.loaiHinh === 'THUONG_TRU' || found.loaiHinh === 'VE_THANG';
      const fee = isResident ? 0 : (isBike ? 5000 : hours * 20000);

      setOutFeeEstimate({
        bienSo: found.bienSo || found.bienSoXe,
        loaiXe: isBike ? 'Xe máy' : 'Ô tô',
        maViTri: found.maViTri || found.id,
        thoiGianVao: timeIn,
        thoiGianRa: now,
        soGio: hours,
        isResident,
        donGia: isResident ? '0 đ (Cư dân thường trú)' : (isBike ? '5.000 đ / lượt' : '20.000 đ / giờ'),
        tongTien: fee
      });
    } else {
      setSelectedParkedVehicle(null);
      setOutFeeEstimate(null);
    }
  }, [outPlate, parkedVehicles]);

  // ================= XỬ LÝ NHẬN DIỆN CỔNG VÀO =================
  const handleInImageSelect = (e) => {
    const file = e.target.files[0];
    if (file) {
      setInImageFile(file);
      setInImagePreview(URL.createObjectURL(file));
      setInBox(null);
      setInPlateCropBase64(null);
      triggerInAiScan(file);
    }
  };

  const triggerInAiScan = async (fileToScan = inImageFile, forceLow = false) => {
    setInScanning(true);
    setInMessage(null);
    try {
      let res;
      if (fileToScan) {
        const formData = new FormData();
        formData.append('image', fileToScan);
        if (forceLow) formData.append('force_low_conf', 'true');
        res = await api.detectPlateAI(formData);
      } else {
        res = await api.detectPlateAI({ force_low_conf: forceLow });
      }

      if (res.success) {
        const detected = (res.data.bienSoNhanDien || '').trim();
        const conf = (res.data.doTinCay || 0) / 100;
        const vType = res.data.loaiPhuongTien === 'XE_MAY' ? 'Xe may' : 'O to';

        setInPlate(detected);
        setInAiConfidence(conf);
        setInVehicleType(vType);
        setInBox(res.data.box || null);
        setInPlateCropBase64(res.data.plateCropBase64 || null);
        setInEngine(res.data.engine || 'YOLOv8 + OCR');
        setInTimeMs(res.data.thoiGianXuLyMs || null);

        if (!detected || conf < 0.70) {
          setInMessage({
            type: 'warning',
            text: detected 
              ? `Độ chính xác nhận diện thấp (${(conf * 100).toFixed(1)}% < 70%). Vui lòng kiểm tra và hiệu chỉnh thủ công biển số (UC-15)!`
              : `Không tìm thấy biển số xe hợp lệ từ ảnh. Vui lòng nhập biển số thủ công vào ô bên dưới!`,
            canOverride: true
          });
        } else {
          setInMessage({
            type: 'success',
            text: `Nhận diện thành công: ${detected} (${vType === 'Xe may' ? 'Xe máy' : 'Ô tô'}) - Độ chính xác: ${(conf * 100).toFixed(1)}%`
          });
        }
      }
    } catch (err) {
      setInMessage({ type: 'error', text: 'Lỗi khi kích hoạt nhận diện cổng vào' });
    } finally {
      setInScanning(false);
    }
  };

  const handleInSubmit = async (override = false) => {
    if (!inPlate.trim()) {
      setInMessage({ type: 'error', text: 'Vui lòng nhập hoặc chụp ảnh biển số xe vào!' });
      return;
    }

    setInSubmitting(true);
    try {
      let payload;
      if (inImageFile) {
        const formData = new FormData();
        formData.append('image', inImageFile);
        formData.append('bien_so', inPlate.trim());
        formData.append('loai_xe', inVehicleType);
        if (inSlot) formData.append('ma_vi_tri', inSlot);
        if (override) formData.append('override', 'true');
        payload = formData;
      } else {
        payload = {
          bien_so: inPlate.trim(),
          loai_xe: inVehicleType,
          ma_vi_tri: inSlot || undefined,
          override: override
        };
      }

      const res = await api.xeVao(payload);

      if (res.success) {
        const admittedPlate = inPlate.trim().toUpperCase();
        if (res.data?.canh_bao_blacklist) {
          const bl = res.data.thong_tin_blacklist || {};
          setInMessage({
            type: 'warning',
            text: `CẢNH BÁO AN NINH: Phương tiện ${admittedPlate} nằm trong DANH SÁCH ĐEN! Lý do: ${bl.lyDo || 'Vi phạm an ninh'}. ${res.message}`
          });
        } else {
          setInMessage({
            type: 'success',
            text: `Xác nhận thành công! Phương tiện ${admittedPlate} đã vào bãi. Barrier Làn 01 đã mở.`
          });
        }

        // Reset form Cổng vào
        setInPlate('');
        setInSlot('');
        setInAiConfidence(null);
        setInImageFile(null);
        setInImagePreview(null);
        setInBox(null);
        setInPlateCropBase64(null);

        // Đồng bộ cập nhật danh sách ô đỗ & xe trong bãi
        if (onTransactionSuccess) onTransactionSuccess();

        // TỰ ĐỘNG CHUYỂN SANG CỔNG RA (LÀN 02) NHƯ HỆ THỐNG CHUYÊN NGHIỆP
        setTimeout(() => {
          handleSwitchGate('out');
          setOutPlate(admittedPlate);
          setOutMessage({
            type: 'info',
            text: `Phương tiện [${admittedPlate}] vừa check-in vào bãi thành công. Đã tự động đồng bộ sang Cổng Ra sẵn sàng xử lý!`
          });
        }, 800);
      } else {
        setInMessage({
          type: 'warning',
          text: res.message,
          canOverride: res.require_override
        });
      }
    } catch (err) {
      setInMessage({ type: 'error', text: 'Không thể kết nối đến máy chủ Cổng vào' });
    } finally {
      setInSubmitting(false);
    }
  };

  // ================= XỬ LÝ NHẬN DIỆN CỔNG RA =================
  const handleOutImageSelect = (e) => {
    const file = e.target.files[0];
    if (file) {
      setOutImageFile(file);
      setOutImagePreview(URL.createObjectURL(file));
      triggerOutAiScan(file);
    }
  };

  const triggerOutAiScan = async (fileToScan = outImageFile) => {
    setOutScanning(true);
    setOutMessage(null);
    try {
      let res;
      if (fileToScan) {
        const formData = new FormData();
        formData.append('image', fileToScan);
        res = await api.detectPlateAI(formData);
      } else {
        res = await api.detectPlateAI();
      }

      if (res.success) {
        const detected = res.data.bienSoNhanDien;
        setOutPlate(detected);
        setOutMessage({
          type: 'info',
          text: `Nhận diện biển số cổng ra: ${detected}`
        });
      }
    } catch (err) {
      setOutMessage({ type: 'error', text: 'Lỗi khi kích hoạt nhận diện Cổng ra' });
    } finally {
      setOutScanning(false);
    }
  };

  const handleOutSubmit = async () => {
    if (!outPlate.trim()) {
      setOutMessage({ type: 'error', text: 'Vui lòng nhập hoặc chọn biển số xe cần ra!' });
      return;
    }

    setOutSubmitting(true);
    try {
      let payload;
      if (outImageFile) {
        const formData = new FormData();
        formData.append('image', outImageFile);
        formData.append('bien_so', outPlate.trim());
        formData.append('phuong_thuc_thanh_toan', outPaymentMethod);
        payload = formData;
      } else {
        payload = {
          bien_so: outPlate.trim(),
          phuong_thuc_thanh_toan: outPaymentMethod
        };
      }

      const res = await api.xeRa(payload);

      if (res.success) {
        setOutMessage({
          type: 'success',
          text: `Thanh toán thành công! ${res.message}. Barrier Làn 02 đã mở.`
        });
        setOutPlate('');
        setOutFeeEstimate(null);
        setOutImageFile(null);
        setOutImagePreview(null);
        if (onTransactionSuccess) onTransactionSuccess();
      } else {
        setOutMessage({ type: 'error', text: res.message });
      }
    } catch (err) {
      setOutMessage({ type: 'error', text: 'Không thể kết nối đến máy chủ Cổng ra' });
    } finally {
      setOutSubmitting(false);
    }
  };

  return (
    <div className="space-y-6">
      {/* 1. Header Bảng Điều Khiển Cổng Phương Tiện */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 bg-white p-5 rounded-2xl border border-slate-200 shadow-xs">
        <div className="flex items-center gap-3">
          <div className={`w-10 h-10 rounded-xl flex items-center justify-center font-bold text-white shadow-sm ${
            currentGate === 'in' ? 'bg-emerald-600' : 'bg-cyan-600'
          }`}>
            {currentGate === 'in' ? <ArrowDownLeft className="w-5 h-5" /> : <ArrowUpRight className="w-5 h-5" />}
          </div>
          <div>
            <h2 className="text-lg font-bold text-slate-900 tracking-tight">
              {currentGate === 'in'
                ? 'Kiểm Soát Cổng Vào (Làn 01 • Check-In)'
                : 'Kiểm Soát Cổng Ra (Làn 02 • Check-Out)'}
            </h2>
            <p className="text-xs text-slate-500">
              {currentGate === 'in'
                ? 'Tiếp nhận phương tiện, nhận diện biển số & chỉ định vị trí đỗ'
                : 'Đối chiếu lượt vào, tính cước phí, thanh toán & mở barrier xuất bãi'}
            </p>
          </div>
        </div>

        <div className="flex flex-wrap items-center gap-2.5">
          {/* Nút chuyển đổi giữa Cổng Vào và Cổng Ra (KHÔNG CÒN NÚT SONG SONG) */}
          <div className="flex items-center bg-slate-100 p-1 rounded-xl border border-slate-200">
            <button
              type="button"
              onClick={() => handleSwitchGate('in')}
              className={`px-3.5 py-1.5 rounded-lg text-xs font-bold transition-all cursor-pointer flex items-center gap-1.5 ${
                currentGate === 'in'
                  ? 'bg-emerald-600 text-white shadow-2xs'
                  : 'text-slate-600 hover:text-slate-900'
              }`}
            >
              <ArrowDownLeft className="w-3.5 h-3.5" />
              <span>Cổng Vào (Làn 01)</span>
              <span className={`text-[10px] px-1.5 py-0.2 rounded font-mono ${
                currentGate === 'in' ? 'bg-white/20 text-white' : 'bg-emerald-100 text-emerald-800'
              }`}>
                {availableSlots.length} ô trống
              </span>
            </button>
            <button
              type="button"
              onClick={() => handleSwitchGate('out')}
              className={`px-3.5 py-1.5 rounded-lg text-xs font-bold transition-all cursor-pointer flex items-center gap-1.5 ${
                currentGate === 'out'
                  ? 'bg-cyan-600 text-white shadow-2xs'
                  : 'text-slate-600 hover:text-slate-900'
              }`}
            >
              <ArrowUpRight className="w-3.5 h-3.5" />
              <span>Cổng Ra (Làn 02)</span>
              <span className={`text-[10px] px-1.5 py-0.2 rounded font-mono ${
                currentGate === 'out' ? 'bg-white/20 text-white' : 'bg-cyan-100 text-cyan-800'
              }`}>
                {parkedVehicles.length} xe
              </span>
            </button>
          </div>
        </div>
      </div>

      {/* 2. Tra Cứu Nhanh Phương Tiện Trong Bãi (Hỗ trợ nhân viên bảo vệ) */}
      <div className="bg-white p-4 rounded-2xl border border-slate-200 shadow-xs space-y-3">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
          <div className="flex items-center gap-2">
            <div className="p-1.5 rounded-lg bg-slate-100 text-slate-700">
              <Search className="w-4 h-4" />
            </div>
            <div>
              <h3 className="text-xs font-bold text-slate-900">Tra Cứu Phương Tiện Đang Trong Bãi</h3>
              <p className="text-[11px] text-slate-500">Tìm kiếm nhanh theo biển số hoặc mã ô đỗ để đối soát hoặc hỗ trợ xuất bãi</p>
            </div>
          </div>

          <div className="relative w-full sm:w-80">
            <input
              type="text"
              value={searchParkedTerm}
              onChange={(e) => setSearchParkedTerm(e.target.value)}
              placeholder="Nhập biển số hoặc mã vị trí (VD: 30H, A-01)..."
              className="w-full pl-8 pr-3 py-1.5 rounded-xl border border-slate-200 bg-slate-50 text-xs text-slate-900 outline-none focus:border-slate-400 focus:bg-white transition"
            />
            <Search className="w-3.5 h-3.5 text-slate-400 absolute left-2.5 top-2" />
          </div>
        </div>

        {/* Danh sách xe đang gửi */}
        <div className="flex items-center gap-2 overflow-x-auto pb-1 text-xs">
          <span className="text-[11px] text-slate-400 font-semibold shrink-0">
            Đang gửi ({parkedVehicles.length}):
          </span>
          {parkedVehicles.length === 0 ? (
            <span className="text-[11px] text-slate-400 italic">Hiện không có phương tiện nào trong bãi</span>
          ) : (
            parkedVehicles
              .filter(v => !searchParkedTerm || (v.bienSo || v.bienSoXe || '').toLowerCase().includes(searchParkedTerm.toLowerCase()) || (v.id || '').toLowerCase().includes(searchParkedTerm.toLowerCase()))
              .map(v => {
                const p = v.bienSo || v.bienSoXe;
                return (
                  <button
                    key={v.id || p}
                    type="button"
                    onClick={() => {
                      handleSwitchGate('out');
                      setOutPlate(p);
                    }}
                    className="px-2.5 py-1 rounded-lg bg-slate-50 hover:bg-slate-100 border border-slate-200 hover:border-slate-300 text-slate-700 flex items-center gap-1.5 shrink-0 transition font-mono text-[11px] cursor-pointer"
                    title="Nhấp để chuyển biển số sang Cổng Ra kiểm tra"
                  >
                    <span className="font-bold">{p}</span>
                    <span className="text-[10px] text-slate-400">({v.maViTri || v.id})</span>
                  </button>
                );
              })
          )}
        </div>
      </div>

      {/* ==============================================================
          HIỂN THỊ RIÊNG TỪNG PHẦN: CỔNG VÀO HOẶC CỔNG RA (KHÔNG SONG SONG)
         ============================================================== */}
      <div>
        {/* ==============================================================
            PHẦN 1: CỔNG VÀO (LÀN 01 - CHECK-IN)
           ============================================================== */}
        {currentGate === 'in' && (
          <div className="bg-white p-5 sm:p-7 rounded-3xl border border-slate-200 border-t-4 border-t-emerald-600 shadow-xs space-y-6 animate-fadeIn">
            {/* Header Cổng Vào */}
            <div className="flex items-center justify-between border-b border-slate-100 pb-4">
              <div className="flex items-center gap-3">
                <div className="h-10 w-10 rounded-xl bg-emerald-50 text-emerald-700 flex items-center justify-center border border-emerald-200 font-bold">
                  <ArrowDownLeft className="w-5 h-5" />
                </div>
                <div>
                  <div className="flex items-center gap-2">
                    <h3 className="font-extrabold text-base sm:text-lg text-slate-900 tracking-tight">CỔNG VÀO (LÀN 01 • CHECK-IN)</h3>
                    <span className="text-[10px] font-mono font-bold px-2 py-0.5 rounded-full bg-emerald-100 text-emerald-800 border border-emerald-200">
                      GATE_IN_01
                    </span>
                  </div>
                  <p className="text-xs text-slate-500 mt-0.5">Tiếp nhận phương tiện, nhận diện biển số & chỉ định vị trí đỗ tự động</p>
                </div>
              </div>

              <span className="text-xs font-mono font-semibold px-3 py-1.5 rounded-xl bg-emerald-50 text-emerald-700 border border-emerald-200">
                {availableSlots.length} ô trống khả dụng
              </span>
            </div>

            {/* Layout 2 Cột Nội Bộ Của Cổng Vào */}
            <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 items-start">
              {/* Cột trái (7 cols): Mẫu phương tiện + Camera Viewport + Crop ROI + Độ tin cậy */}
              <div className="lg:col-span-7 space-y-4">
                {/* Dữ liệu mẫu kiểm thử phương tiện (Xóa toàn bộ icon/emoji) */}
                <div className="bg-slate-50 p-3.5 rounded-2xl border border-slate-200 space-y-2">
                  <div className="flex items-center justify-between text-xs">
                    <span className="font-semibold text-slate-700">Dữ liệu mẫu kiểm thử:</span>
                    <span className="text-[10px] text-slate-400 font-mono">Nạp tự động</span>
                  </div>
                  <div className="grid grid-cols-2 sm:grid-cols-4 gap-2">
                    {SAMPLE_VEHICLES.map((item) => (
                      <button
                        key={item.id}
                        type="button"
                        onClick={() => handleLoadPreset(item)}
                        disabled={inScanning}
                        className="p-2.5 rounded-xl bg-white hover:bg-slate-100 border border-slate-200 transition-all text-left cursor-pointer disabled:opacity-50 shadow-2xs"
                      >
                        <div className="flex items-center justify-between">
                          <span className="text-xs font-bold text-slate-800 truncate">{item.title}</span>
                          <span className={`text-[9px] font-mono px-1.5 py-0.5 rounded border ${item.badgeClass}`}>
                            {item.badge}
                          </span>
                        </div>
                        <div className="text-[11px] font-mono text-slate-600 font-semibold mt-1 truncate">
                          {item.plate}
                        </div>
                      </button>
                    ))}
                  </div>
                </div>

                {/* Camera Giám Sát Làn Vào */}
                <div className="relative rounded-2xl bg-slate-900 border border-slate-800 overflow-hidden min-h-[260px] flex flex-col justify-between p-3.5 shadow-inner">
                  {/* Viewport Header */}
                  <div className="flex items-center justify-between z-10 text-white gap-2">
                    <span className="flex items-center gap-1.5 bg-slate-800/90 text-slate-200 text-[10px] px-2 py-0.5 rounded font-mono border border-slate-700 shrink-0">
                      <span className="w-2 h-2 rounded-full bg-emerald-500 animate-pulse"></span>
                      CAM_01 • LÀN VÀO
                    </span>
                    <div className="flex items-center gap-1.5 ml-auto">
                      <select
                        value={selectedInDeviceId}
                        onChange={(e) => handleInCameraChange(e.target.value)}
                        className="bg-slate-800/90 hover:bg-slate-700 text-cyan-300 text-[10px] font-mono px-2 py-1 rounded-lg border border-slate-700 outline-none max-w-[170px] cursor-pointer truncate"
                        title="Chọn nguồn camera hoặc OBS Virtual Camera"
                      >
                        {videoDevices.length === 0 ? (
                          <option value="">📷 Camera mặc định / OBS</option>
                        ) : (
                          videoDevices.map((d, idx) => (
                            <option key={d.deviceId || idx} value={d.deviceId}>
                              {d.label ? (d.label.toLowerCase().includes('obs') ? `🎥 ${d.label}` : `📷 ${d.label}`) : `Camera ${idx + 1}`}
                            </option>
                          ))
                        )}
                      </select>
                      {inTimeMs && (
                        <span className="text-[9px] bg-slate-800 text-emerald-400 px-1.5 py-0.5 rounded font-mono border border-slate-700 shrink-0">
                          {inTimeMs}ms
                        </span>
                      )}
                    </div>
                  </div>

                  {/* Viewport Content */}
                  <div className="my-auto flex flex-col items-center justify-center text-center py-3 z-10 relative">
                    <canvas ref={inCanvasRef} className="hidden" />
                    {inWebcamActive ? (
                      <div className="relative rounded-xl overflow-hidden border-2 border-emerald-500 max-h-56 w-full flex items-center justify-center bg-black">
                        <video ref={inVideoRef} autoPlay playsInline muted className="object-cover max-h-52 w-auto rounded-lg" />
                      </div>
                    ) : inImagePreview ? (
                      <div className="relative rounded-xl overflow-hidden border border-slate-700 max-h-56 w-full flex items-center justify-center bg-black">
                        <img src={inImagePreview} alt="Phương tiện vào" className="object-contain max-h-52 w-auto rounded-lg" />

                        {/* Bounding Box nhận diện biển số */}
                        {inBox && (
                          <div
                            className="absolute border-2 border-emerald-400 bg-emerald-500/20 rounded pointer-events-none transition-all"
                            style={{
                              left: `${inBox.pct_left}%`,
                              top: `${inBox.pct_top}%`,
                              width: `${inBox.pct_width}%`,
                              height: `${inBox.pct_height}%`
                            }}
                          >
                            <span className="absolute -top-4 left-0 bg-emerald-600 text-white font-mono font-bold text-[8px] px-1 py-0.2 rounded shadow">
                              BIỂN SỐ
                            </span>
                          </div>
                        )}
                      </div>
                    ) : inScanning ? (
                      <div className="space-y-2 py-8 text-white">
                        <RefreshCw className="w-9 h-9 text-emerald-400 animate-spin mx-auto" />
                        <p className="text-xs text-emerald-300 font-mono">Đang quét và nhận diện biển số...</p>
                      </div>
                    ) : (
                      <div className="space-y-2 py-6 text-slate-400">
                        <Camera className="w-10 h-10 text-slate-500 mx-auto" />
                        <p className="text-xs text-slate-300 font-medium">Bật camera hoặc tải ảnh phương tiện vào</p>
                        <p className="text-[10px] text-slate-500">Hỗ trợ nhận diện tự động biển số ô tô và xe máy</p>
                      </div>
                    )}
                  </div>

                  {/* Thanh thao tác Camera Làn Vào */}
                  <div className="flex items-center gap-2 pt-2 border-t border-slate-800 z-10">
                    <button
                      type="button"
                      onClick={toggleInWebcam}
                      className={`py-2 px-3 rounded-xl flex items-center justify-center gap-1 text-xs font-semibold border transition-all cursor-pointer ${
                        inWebcamActive
                          ? 'bg-rose-600 hover:bg-rose-700 border-rose-500 text-white'
                          : 'bg-slate-800 hover:bg-slate-700 border-slate-700 text-slate-200'
                      }`}
                      title="Bật/Tắt Camera thiết bị"
                    >
                      {inWebcamActive ? <VideoOff className="w-4 h-4" /> : <Video className="w-4 h-4" />}
                    </button>

                    {inWebcamActive ? (
                      <button
                        type="button"
                        onClick={captureInFrame}
                        className="flex-1 py-2 px-3 rounded-xl bg-emerald-600 hover:bg-emerald-500 text-white text-xs font-bold flex items-center justify-center gap-1.5 transition-all cursor-pointer shadow"
                      >
                        <Scan className="w-4 h-4" />
                        <span>Chụp & Nhận Diện</span>
                      </button>
                    ) : (
                      <>
                        <label className="flex-1 cursor-pointer py-2 px-3 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-200 text-xs font-semibold flex items-center justify-center gap-1.5 border border-slate-700 transition-all">
                          <Upload className="w-4 h-4 text-emerald-400" />
                          <span>Tải ảnh xe</span>
                          <input type="file" accept="image/*" onChange={handleInImageSelect} className="hidden" />
                        </label>

                        <button
                          type="button"
                          onClick={() => triggerInAiScan(inImageFile, false)}
                          disabled={inScanning}
                          className="flex-1 py-2 px-3 rounded-xl bg-emerald-600 hover:bg-emerald-500 text-white text-xs font-bold flex items-center justify-center gap-1.5 transition-all disabled:opacity-50 cursor-pointer shadow"
                        >
                          <span>Quét biển số</span>
                        </button>

                        <button
                          type="button"
                          onClick={() => triggerInAiScan(null, true)}
                          title="Giả lập tình huống độ tin cậy thấp < 70% để kiểm tra xác nhận thủ công"
                          className="py-2 px-2.5 rounded-xl bg-slate-800 hover:bg-slate-700 text-amber-400 border border-slate-700 text-[10px] font-mono transition-all cursor-pointer"
                        >
                          Test UC-15
                        </button>
                      </>
                    )}
                  </div>
                </div>

                {/* Vùng Trích Xuất & Đánh Giá Độ Tin Cậy */}
                {inPlateCropBase64 && (
                  <div className="p-3.5 rounded-xl bg-slate-50 border border-slate-200 flex items-center justify-between gap-3">
                    <div className="flex items-center gap-3">
                      <div className="h-10 w-24 rounded-lg overflow-hidden border border-slate-300 bg-white flex items-center justify-center">
                        <img src={inPlateCropBase64} alt="Vùng biển số" className="h-full w-full object-contain" />
                      </div>
                      <div>
                        <div className="text-xs font-bold text-slate-900">Vùng biển số trích xuất</div>
                        <div className="text-[10px] text-slate-500 font-mono mt-0.5">
                          Thuật toán: <span className="font-semibold text-slate-700">{inEngine}</span>
                        </div>
                      </div>
                    </div>
                    <span className="text-[10px] font-mono px-2 py-0.5 rounded bg-emerald-50 text-emerald-700 border border-emerald-200">
                      Chuẩn hóa
                    </span>
                  </div>
                )}

                {inAiConfidence !== null && (
                  <div className={`p-3.5 rounded-xl border flex items-center justify-between ${
                    inAiConfidence >= 0.70
                      ? 'bg-emerald-50 border-emerald-200 text-emerald-800'
                      : 'bg-amber-50 border-amber-300 text-amber-800'
                  }`}>
                    <div className="flex items-center gap-2.5">
                      {inAiConfidence >= 0.70 ? (
                        <ShieldCheck className="w-5 h-5 text-emerald-600 shrink-0" />
                      ) : (
                        <ShieldAlert className="w-5 h-5 text-amber-600 shrink-0" />
                      )}
                      <div>
                        <div className="text-xs font-bold">
                          {inAiConfidence >= 0.70 ? 'Nhận diện biển số hợp lệ' : 'Độ chính xác thấp (< 70%)'}
                        </div>
                        <div className="text-[11px] opacity-80">
                          {inAiConfidence >= 0.70
                            ? 'Đủ điều kiện ghi nhận lượt vào và phân bổ ô đỗ'
                            : 'Đề nghị nhân viên kiểm tra lại biển số ở ô hiệu chỉnh thủ công'}
                        </div>
                      </div>
                    </div>

                    <div className="px-2.5 py-1 rounded-lg font-mono font-bold text-xs bg-white border border-slate-200">
                      {(inAiConfidence * 100).toFixed(1)}%
                    </div>
                  </div>
                )}
              </div>

              {/* Cột phải (5 cols): Nhập biển số + Loại xe + Ô đỗ + Nút mở barrier */}
              <div className="lg:col-span-5 space-y-4">
                <div className="space-y-3 bg-slate-50 p-4 sm:p-5 rounded-2xl border border-slate-200">
                  <div className="flex items-center justify-between">
                    <label className="text-xs font-bold text-slate-800 flex items-center gap-1.5">
                      <FileEdit className="w-3.5 h-3.5 text-slate-600" />
                      Biển số xe vào (Làn 01):
                    </label>
                    <span className="text-[10px] text-slate-500 font-mono">Tự động viết hoa</span>
                  </div>

                  <input
                    type="text"
                    value={inPlate}
                    onChange={(e) => setInPlate(e.target.value.toUpperCase())}
                    placeholder="VD: 12-B1 168.88 hoặc 30H-892.45"
                    className="w-full px-4 py-3 rounded-xl bg-white border border-slate-300 focus:border-slate-500 text-base font-mono font-bold text-slate-900 placeholder-slate-400 tracking-wider uppercase shadow-2xs"
                  />

                  <div className="grid grid-cols-2 gap-3 pt-1">
                    <div>
                      <label className="block text-xs font-medium text-slate-600 mb-1">Loại phương tiện:</label>
                      <select
                        value={inVehicleType}
                        onChange={(e) => setInVehicleType(e.target.value)}
                        className="w-full px-3 py-2 rounded-xl bg-white border border-slate-300 text-xs text-slate-900"
                      >
                        <option value="O to">Ô tô (Dưới 9 chỗ)</option>
                        <option value="Xe may">Xe máy / Tay ga</option>
                        <option value="Xe tai">Xe tải / Khác</option>
                      </select>
                    </div>

                    <div>
                      <label className="block text-xs font-medium text-slate-600 mb-1">Chỉ định vị trí đỗ:</label>
                      <select
                        value={inSlot}
                        onChange={(e) => setInSlot(e.target.value)}
                        className="w-full px-3 py-2 rounded-xl bg-white border border-slate-300 text-xs text-slate-900 font-mono"
                      >
                        <option value="">-- Tự động phân bổ --</option>
                        {availableSlots.map(s => (
                          <option key={s.id} value={s.id}>
                            {s.id} ({s.tenViTri || s.id})
                          </option>
                        ))}
                      </select>
                    </div>
                  </div>
                </div>

                {/* Phản Hồi Trạng Thái Cổng Vào */}
                {inMessage && (
                  <div className={`p-4 rounded-xl text-xs flex items-center justify-between border ${
                    inMessage.type === 'success'
                      ? 'bg-emerald-50 border-emerald-200 text-emerald-800'
                      : inMessage.type === 'warning'
                      ? 'bg-amber-50 border-amber-200 text-amber-800'
                      : 'bg-rose-50 border-rose-200 text-rose-800'
                  }`}>
                    <span className="font-medium">{inMessage.text}</span>
                    {inMessage.canOverride && (
                      <button
                        type="button"
                        onClick={() => handleInSubmit(true)}
                        className="px-3 py-1 rounded-lg bg-amber-600 hover:bg-amber-700 text-white font-bold text-xs shrink-0 ml-2 cursor-pointer shadow-xs"
                      >
                        Xác nhận luôn
                      </button>
                    )}
                  </div>
                )}

                {/* Nút Điều Khiển Barrier Cổng Vào */}
                <button
                  type="button"
                  onClick={() => handleInSubmit(false)}
                  disabled={inSubmitting || inScanning}
                  className="w-full py-4 px-4 rounded-xl bg-slate-900 hover:bg-slate-800 text-white font-bold text-sm flex items-center justify-center gap-2 shadow transition-all disabled:opacity-50 cursor-pointer"
                >
                  {inSubmitting ? (
                    <RefreshCw className="w-4 h-4 animate-spin" />
                  ) : (
                    <CheckCircle2 className="w-4 h-4 text-emerald-400" />
                  )}
                  <span>Xác Nhận Cho Xe Vào & Mở Barrier (Làn 01)</span>
                </button>

                {/* Nút chuyển nhanh sang Cổng Ra */}
                <div className="p-3.5 rounded-2xl bg-slate-50 border border-slate-200 flex items-center justify-between gap-3 text-xs">
                  <span className="text-slate-600">Cần xử lý phương tiện xuất bãi?</span>
                  <button
                    type="button"
                    onClick={() => handleSwitchGate('out')}
                    className="px-3.5 py-1.5 rounded-xl bg-cyan-600 hover:bg-cyan-700 text-white font-bold flex items-center gap-1.5 transition cursor-pointer shadow-2xs"
                  >
                    <span>Chuyển sang Cổng Ra</span>
                    <ArrowUpRight className="w-3.5 h-3.5" />
                  </button>
                </div>
              </div>
            </div>
          </div>
        )}

        {/* ==============================================================
            PHẦN 2: CỔNG RA (LÀN 02 - CHECK-OUT)
           ============================================================== */}
        {currentGate === 'out' && (
          <div className="bg-white p-5 sm:p-7 rounded-3xl border border-slate-200 border-t-4 border-t-cyan-600 shadow-xs space-y-6 animate-fadeIn">
            {/* Header Cổng Ra */}
            <div className="flex items-center justify-between border-b border-slate-100 pb-4">
              <div className="flex items-center gap-3">
                <div className="h-10 w-10 rounded-xl bg-cyan-50 text-cyan-700 flex items-center justify-center border border-cyan-200 font-bold">
                  <ArrowUpRight className="w-5 h-5" />
                </div>
                <div>
                  <div className="flex items-center gap-2">
                    <h3 className="font-extrabold text-base sm:text-lg text-slate-900 tracking-tight">CỔNG RA (LÀN 02 • CHECK-OUT)</h3>
                    <span className="text-[10px] font-mono font-bold px-2 py-0.5 rounded-full bg-cyan-100 text-cyan-800 border border-cyan-200">
                      GATE_OUT_01
                    </span>
                  </div>
                  <p className="text-xs text-slate-500 mt-0.5">Đối chiếu lượt vào, tính cước phí, thanh toán VietQR & mở barrier xuất bãi</p>
                </div>
              </div>

              <span className="text-xs font-mono font-semibold px-3 py-1.5 rounded-xl bg-cyan-50 text-cyan-700 border border-cyan-200">
                {parkedVehicles.length} xe trong bãi
              </span>
            </div>

            {/* Layout 2 Cột Nội Bộ Của Cổng Ra */}
            <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 items-start">
              {/* Cột trái (7 cols): Chọn nhanh xe ra + Camera Viewport */}
              <div className="lg:col-span-7 space-y-4">
                {/* Danh Sách Phương Tiện Đang Trong Bãi (Xóa toàn bộ icon) */}
                <div className="bg-slate-50 p-3.5 rounded-2xl border border-slate-200 space-y-2">
                  <div className="flex items-center justify-between text-xs">
                    <span className="font-semibold text-slate-700">Chọn nhanh xe ra khỏi bãi:</span>
                    <span className="text-[10px] text-slate-500 font-mono">{parkedVehicles.length} phương tiện</span>
                  </div>
                  {parkedVehicles.length > 0 ? (
                    <div className="flex flex-wrap gap-1.5 max-h-28 overflow-y-auto pr-1">
                      {parkedVehicles.map((v) => {
                        const plate = v.bienSo || v.bienSoXe;
                        const isSelected = outPlate.toUpperCase() === plate.toUpperCase();
                        return (
                          <button
                            key={v.id || plate}
                            type="button"
                            onClick={() => setOutPlate(plate)}
                            className={`px-3 py-1.5 rounded-xl text-xs font-mono font-bold border transition-all cursor-pointer ${
                              isSelected
                                ? 'bg-slate-900 text-white border-slate-900 shadow-xs'
                                : 'bg-white hover:bg-slate-100 text-slate-700 border-slate-200'
                            }`}
                          >
                            <span>{plate}</span>
                            <span className={`text-[10px] ml-1.5 px-1 py-0.2 rounded ${isSelected ? 'bg-white/20' : 'bg-slate-100 text-slate-500'}`}>
                              {v.maViTri || v.id}
                            </span>
                          </button>
                        );
                      })}
                    </div>
                  ) : (
                    <p className="text-[11px] text-slate-400 italic py-1">Hiện không có xe nào trong bãi.</p>
                  )}
                </div>

                {/* Camera Giám Sát Làn Ra */}
                <div className="relative rounded-2xl bg-slate-900 border border-slate-800 overflow-hidden min-h-[260px] flex flex-col justify-between p-3.5 shadow-inner">
                  {/* Viewport Header */}
                  <div className="flex items-center justify-between z-10 text-white gap-2">
                    <span className="flex items-center gap-1.5 bg-slate-800/90 text-slate-200 text-[10px] px-2 py-0.5 rounded font-mono border border-slate-700 shrink-0">
                      <span className="w-2 h-2 rounded-full bg-cyan-500 animate-pulse"></span>
                      CAM_02 • LÀN RA
                    </span>
                    <div className="flex items-center gap-1.5 ml-auto">
                      <select
                        value={selectedOutDeviceId}
                        onChange={(e) => handleOutCameraChange(e.target.value)}
                        className="bg-slate-800/90 hover:bg-slate-700 text-cyan-300 text-[10px] font-mono px-2 py-1 rounded-lg border border-slate-700 outline-none max-w-[170px] cursor-pointer truncate"
                        title="Chọn nguồn camera hoặc OBS Virtual Camera"
                      >
                        {videoDevices.length === 0 ? (
                          <option value="">📷 Camera mặc định / OBS</option>
                        ) : (
                          videoDevices.map((d, idx) => (
                            <option key={d.deviceId || idx} value={d.deviceId}>
                              {d.label ? (d.label.toLowerCase().includes('obs') ? `🎥 ${d.label}` : `📷 ${d.label}`) : `Camera ${idx + 1}`}
                            </option>
                          ))
                        )}
                      </select>
                      <span className="text-[10px] text-slate-400 font-mono shrink-0">1080p • 60fps</span>
                    </div>
                  </div>

                  {/* Viewport Content */}
                  <div className="my-auto flex flex-col items-center justify-center text-center py-3 z-10">
                    <canvas ref={outCanvasRef} className="hidden" />
                    {outWebcamActive ? (
                      <div className="relative rounded-xl overflow-hidden border-2 border-cyan-500 max-h-56 w-full flex items-center justify-center bg-black">
                        <video ref={outVideoRef} autoPlay playsInline muted className="object-cover max-h-52 w-auto rounded-lg" />
                      </div>
                    ) : outImagePreview ? (
                      <div className="relative rounded-xl overflow-hidden border border-slate-700 max-h-56 w-full flex items-center justify-center bg-black">
                        <img src={outImagePreview} alt="Phương tiện ra" className="object-contain max-h-52 w-auto rounded-lg" />
                      </div>
                    ) : outScanning ? (
                      <div className="space-y-2 py-8 text-white">
                        <RefreshCw className="w-9 h-9 text-cyan-400 animate-spin mx-auto" />
                        <p className="text-xs text-cyan-300 font-mono">Đang quét và nhận diện biển số xe ra...</p>
                      </div>
                    ) : (
                      <div className="space-y-2 py-6 text-slate-400">
                        <Camera className="w-10 h-10 text-slate-500 mx-auto" />
                        <p className="text-xs text-slate-300 font-medium">Bật camera hoặc tải ảnh phương tiện ra</p>
                        <p className="text-[10px] text-slate-500">Đối chiếu dữ liệu với lượt gửi trong bãi</p>
                      </div>
                    )}
                  </div>

                  {/* Thanh thao tác Camera Làn Ra */}
                  <div className="flex items-center gap-2 pt-2 border-t border-slate-800 z-10">
                    <button
                      type="button"
                      onClick={toggleOutWebcam}
                      className={`py-2 px-3 rounded-xl flex items-center justify-center gap-1 text-xs font-semibold border transition-all cursor-pointer ${
                        outWebcamActive
                          ? 'bg-rose-600 hover:bg-rose-700 border-rose-500 text-white'
                          : 'bg-slate-800 hover:bg-slate-700 border-slate-700 text-slate-200'
                      }`}
                      title="Bật/Tắt Camera thiết bị"
                    >
                      {outWebcamActive ? <VideoOff className="w-4 h-4" /> : <Video className="w-4 h-4" />}
                    </button>

                    {outWebcamActive ? (
                      <button
                        type="button"
                        onClick={captureOutFrame}
                        className="flex-1 py-2 px-3 rounded-xl bg-cyan-600 hover:bg-cyan-500 text-white text-xs font-bold flex items-center justify-center gap-1.5 transition-all cursor-pointer shadow"
                      >
                        <Scan className="w-4 h-4" />
                        <span>Chụp & Nhận Diện</span>
                      </button>
                    ) : (
                      <>
                        <label className="flex-1 cursor-pointer py-2 px-3 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-200 text-xs font-semibold flex items-center justify-center gap-1.5 border border-slate-700 transition-all">
                          <Upload className="w-4 h-4 text-cyan-400" />
                          <span>Tải ảnh xe</span>
                          <input type="file" accept="image/*" onChange={handleOutImageSelect} className="hidden" />
                        </label>

                        <button
                          type="button"
                          onClick={() => triggerOutAiScan(outImageFile)}
                          disabled={outScanning}
                          className="flex-1 py-2 px-3 rounded-xl bg-cyan-600 hover:bg-cyan-500 text-white text-xs font-bold flex items-center justify-center gap-1.5 transition-all disabled:opacity-50 cursor-pointer shadow"
                        >
                          <span>Quét biển số</span>
                        </button>
                      </>
                    )}
                  </div>
                </div>
              </div>

              {/* Cột phải (5 cols): Biển số ra + Hóa đơn & VietQR + Nút mở barrier */}
              <div className="lg:col-span-5 space-y-4">
                {/* Ô Nhập Biển Số Xe Ra & Đối Soát */}
                <div className="space-y-3 bg-slate-50 p-4 sm:p-5 rounded-2xl border border-slate-200">
                  <div className="flex items-center justify-between">
                    <label className="text-xs font-bold text-slate-800 flex items-center gap-1.5">
                      <FileEdit className="w-3.5 h-3.5 text-slate-600" />
                      Biển số xe ra (Làn 02):
                    </label>
                    <span className="text-[10px] text-slate-500 font-mono">Đối chiếu CSDL</span>
                  </div>

                  <input
                    type="text"
                    value={outPlate}
                    onChange={(e) => setOutPlate(e.target.value.toUpperCase())}
                    placeholder="VD: 12-B1 168.88 hoặc 30H-892.45"
                    className="w-full px-4 py-3 rounded-xl bg-white border border-slate-300 focus:border-slate-500 text-base font-mono font-bold text-slate-900 placeholder-slate-400 tracking-wider uppercase shadow-2xs"
                  />

                  {selectedParkedVehicle && (
                    <div className="text-xs text-emerald-800 bg-emerald-50 px-3.5 py-2 rounded-xl border border-emerald-200 font-semibold flex items-center gap-2">
                      <Check className="w-4 h-4 text-emerald-600" />
                      <span>Đã khớp dữ liệu vào: Vị trí {selectedParkedVehicle.maViTri || selectedParkedVehicle.id}</span>
                    </div>
                  )}
                </div>

                {/* Hóa Đơn & Thanh Toán Cổng Ra */}
                {outFeeEstimate && (
                  <div className="p-4 sm:p-5 rounded-2xl bg-cyan-50/40 border border-cyan-200 space-y-3">
                    <div className="flex items-center justify-between border-b border-cyan-200 pb-2">
                      <span className="text-xs font-bold text-cyan-900 flex items-center gap-1.5">
                        <Clock className="w-3.5 h-3.5 text-cyan-700" />
                        Chi Tiết Thời Gian & Cước Phí
                      </span>
                      <span className="text-xs font-mono font-bold text-cyan-800 bg-cyan-100 px-2 py-0.5 rounded border border-cyan-200">
                        Ô: {outFeeEstimate.maViTri}
                      </span>
                    </div>

                    <div className="grid grid-cols-2 gap-2 text-xs">
                      <div>
                        <span className="text-slate-500 text-[11px] block">Giờ vào:</span>
                        <span className="font-mono text-slate-900 text-xs">
                          {new Date(outFeeEstimate.thoiGianVao).toLocaleTimeString('vi-VN')}
                        </span>
                      </div>
                      <div>
                        <span className="text-slate-500 text-[11px] block">Thời gian đỗ:</span>
                        <span className="font-bold text-cyan-900 text-xs">{outFeeEstimate.soGio} giờ</span>
                      </div>
                    </div>

                    <div className="flex items-center justify-between pt-2 border-t border-cyan-200">
                      <div>
                        <span className="text-xs font-bold text-slate-700 block">Tổng thanh toán:</span>
                        <span className="text-[11px] text-slate-500">{outFeeEstimate.donGia}</span>
                      </div>
                      <span className="text-xl font-mono font-black text-cyan-700">
                        {outFeeEstimate.tongTien.toLocaleString('vi-VN')} đ
                      </span>
                    </div>

                    {/* Lựa chọn phương thức thanh toán */}
                    <div className="pt-1">
                      <label className="block text-[11px] font-medium text-slate-600 mb-1.5">Phương thức thanh toán:</label>
                      <div className="grid grid-cols-3 gap-2">
                        <button
                          type="button"
                          onClick={() => setOutPaymentMethod('QR_CODE')}
                          className={`py-2 px-2 rounded-xl text-xs font-semibold flex items-center justify-center gap-1 border transition-all cursor-pointer ${
                            outPaymentMethod === 'QR_CODE'
                              ? 'bg-slate-900 text-white border-slate-900 shadow-xs'
                              : 'bg-white text-slate-700 border-slate-200 hover:bg-slate-100'
                          }`}
                        >
                          <QrCode className="w-3.5 h-3.5" />
                          <span>VietQR</span>
                        </button>
                        <button
                          type="button"
                          onClick={() => setOutPaymentMethod('TIEN_MAT')}
                          className={`py-2 px-2 rounded-xl text-xs font-semibold flex items-center justify-center gap-1 border transition-all cursor-pointer ${
                            outPaymentMethod === 'TIEN_MAT'
                              ? 'bg-slate-900 text-white border-slate-900 shadow-xs'
                              : 'bg-white text-slate-700 border-slate-200 hover:bg-slate-100'
                          }`}
                        >
                          <Banknote className="w-3.5 h-3.5" />
                          <span>Tiền mặt</span>
                        </button>
                        <button
                          type="button"
                          onClick={() => setOutPaymentMethod('THE_NGAN_HANG')}
                          className={`py-2 px-2 rounded-xl text-xs font-semibold flex items-center justify-center gap-1 border transition-all cursor-pointer ${
                            outPaymentMethod === 'THE_NGAN_HANG'
                              ? 'bg-slate-900 text-white border-slate-900 shadow-xs'
                              : 'bg-white text-slate-700 border-slate-200 hover:bg-slate-100'
                          }`}
                        >
                          <CreditCard className="w-3.5 h-3.5" />
                          <span>Quẹt thẻ</span>
                        </button>
                      </div>
                    </div>

                    {/* Mã QR VietQR chuẩn */}
                    {outPaymentMethod === 'QR_CODE' && outFeeEstimate.tongTien > 0 && (
                      <div className="pt-2 border-t border-cyan-200 flex flex-col items-center">
                        <div className="bg-white p-3 rounded-xl text-center border border-slate-200 shadow-xs">
                          <img 
                            src={`https://img.vietqr.io/image/970436-0987654321-compact.jpg?amount=${outFeeEstimate.tongTien}&addInfo=${encodeURIComponent('DOXEAI ' + outFeeEstimate.bienSo)}&accountName=BAI%20DO%20XE%20THONG%20MINH`} 
                            alt="VietQR"
                            className="w-40 h-40 md:w-48 md:h-48 mx-auto"
                          />
                          <p className="text-slate-800 font-bold text-[11px] mt-1.5">Quét mã VietQR để thanh toán</p>
                        </div>
                      </div>
                    )}
                  </div>
                )}

                {/* Phản Hồi Trạng Thái Cổng Ra */}
                {outMessage && (
                  <div className={`p-4 rounded-xl text-xs border ${
                    outMessage.type === 'success' || outMessage.type === 'info'
                      ? 'bg-emerald-50 border-emerald-200 text-emerald-800'
                      : 'bg-rose-50 border-rose-200 text-rose-800'
                  }`}>
                    {outMessage.text}
                  </div>
                )}

                {/* Nút Điều Khiển Barrier Cổng Ra */}
                <button
                  type="button"
                  onClick={handleOutSubmit}
                  disabled={outSubmitting || outScanning}
                  className="w-full py-4 px-4 rounded-xl bg-slate-900 hover:bg-slate-800 text-white font-bold text-sm flex items-center justify-center gap-2 shadow transition-all disabled:opacity-50 cursor-pointer"
                >
                  {outSubmitting ? (
                    <RefreshCw className="w-4 h-4 animate-spin" />
                  ) : (
                    <CheckCircle2 className="w-4 h-4 text-cyan-400" />
                  )}
                  <span>Xác Nhận Thanh Toán & Mở Barrier (Làn 02)</span>
                </button>

                {/* Nút chuyển nhanh về Cổng Vào */}
                <div className="p-3.5 rounded-2xl bg-slate-50 border border-slate-200 flex items-center justify-between gap-3 text-xs">
                  <span className="text-slate-600">Cần tiếp nhận phương tiện mới vào bãi?</span>
                  <button
                    type="button"
                    onClick={() => handleSwitchGate('in')}
                    className="px-3.5 py-1.5 rounded-xl bg-emerald-600 hover:bg-emerald-700 text-white font-bold flex items-center gap-1.5 transition cursor-pointer shadow-2xs"
                  >
                    <ArrowDownLeft className="w-3.5 h-3.5" />
                    <span>Chuyển về Cổng Vào</span>
                  </button>
                </div>
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}

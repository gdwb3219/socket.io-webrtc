import React, { useEffect, useRef, useState } from "react";
import io from 'socket.io-client'

const socket = io('http://localhost:5000'); // 시그널링 서버의 주소

function App() {
  const localVideoRef = useRef(null);
  const remoteVideoRef = useRef(null);
  const [pc, setPc] = useState(null);

  useEffect(() => {
    const peerConnection = new RTCPeerConnection({
      iceServers: [
        {
          urls: 'stun:stun.l.google.com:19302',
        },
      ],
    });

    console.log("PeerConnection created", peerConnection); // PeerConnection 생성 확인용 로그

    setPc(peerConnection);

    peerConnection.onicecandidate = (event) => {
      console.log("ICE Candidate Event: ", event); // ICE Candidate 이벤트 확인용 로그
      if (event.candidate) {
        console.log("Sending candidate", event.candidate); // Candidate 전송 확인용 로그
        socket.emit('candidate', event.candidate);
      }
    };

    peerConnection.ontrack = (event) => {
      remoteVideoRef.current.srcObject = event.streams[0];
    };

        // DataChannel 추가
        const dataChannel = peerConnection.createDataChannel('chat');
        dataChannel.onopen = () => {
          console.log('DataChannel is open');
        };
        dataChannel.onclose = () => {
          console.log('DataChannel is closed');
        };

    // navigator.mediaDevices
    //   .getUserMedia({ video: true, audio: true })
    //   .then((stream) => {
    //     localVideoRef.current.srcObject = stream;
    //     stream.getTracks().forEach((track) => {
    //       peerConnection.addTrack(track, stream);
    //     });
    //   }).catch(error => console.error("Error accessing media devices.", error));

    socket.on('offer', async (data) => {
      console.log("Offer received", data); // Offer 수신 확인용 로그
      await peerConnection.setRemoteDescription(new RTCSessionDescription(data));
      const answer = await peerConnection.createAnswer(); // Answer 생성
      await peerConnection.setLocalDescription(answer);
      console.log("Answer created", answer); // Answer 생성 확인용 로그
      socket.emit('answer', answer);
    });

    socket.on('answer', async (data) => {
      console.log("Answer received", data); // Answer 수신 확인용 로그
      await peerConnection.setRemoteDescription(new RTCSessionDescription(data));
    });

    socket.on('candidate', async (data) => {
      console.log("Candidate received", data); // Candidate 수신 확인용 로그
      try {
        await peerConnection.addIceCandidate(new RTCIceCandidate(data));
      } catch (e) {
        console.error('Error adding received ice candidate', e);
      }
    });

    return () => {
      peerConnection.close();
    };
  }, []);

  const createOffer = async () => {
    console.log("Create Offer button clicked"); // 함수 호출 확인용 로그
    if (!pc) return;
    const offer = await pc.createOffer();
    await pc.setLocalDescription(offer);
    console.log("Offer created", offer); // Offer 생성 확인용 로그
    socket.emit('offer', offer);
  };

  return (
    <div>
      <h1>WebRTC React App</h1>
      <div>
        <video ref={localVideoRef} autoPlay playsInline muted></video>
        <video ref={remoteVideoRef} autoPlay playsInline></video>
      </div>
      <button onClick={createOffer}>Create Offer</button>
    </div>
  );
};

export default App;
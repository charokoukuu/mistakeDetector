import { Button } from '@mui/material';
import React, { useEffect, useState } from 'react';
import { useCallback } from 'react';
import { useDropzone } from 'react-dropzone';
import './App.css';
import { Grid } from '@mui/material';
const cv = (window as any).cv;
type Load = "差分抽出" | "二値化" | "ノイズ除去" | "輪郭抽出" | "完了";
type Status = "select1" | "select2" | "edit" | "loading" | "complete";
let imgA: any, imgB: any;
function App() {


  const [load, setLoad] = useState<Load>("差分抽出");
  const [status, setStatus] = useState<Status>("select1");


  const buttonClick = () => {
    const result = new cv.Mat();
    const grayA = new cv.Mat();
    const grayB = new cv.Mat();
    cv.cvtColor(imgA, grayA, cv.COLOR_BGR2RGB);
    cv.cvtColor(imgB, grayB, cv.COLOR_BGR2RGB);


    // hA, wA, cA = imgA.shape[: 3]
    // hB, wB, cA = imgB.shape[: 3]

    // const akaze = cv.AKAZE_create()
    // const kpA = new cv.MatVector();
    // const kpB = new cv.MatVector();
    // const desA = new cv.MatVector();
    // const desB = new cv.MatVector();

    // akaze.detectAndCompute(imgA, null, kpA, desA)
    // akaze.detectAndCompute(imgB, null, kpB, desB)

    // bf = cv.BFMatcher(cv.NORM_HAMMING, crossCheck = True)
    // const bf = cv.BFMatcher()
    // cv.BFMatcher(cv.NORM_HAMMING, true).match(desA, desB, bf)
    // // matches = bf.match(desA, desB)
    // const matches = bf.match(desA, desB)
    // // matches = sorted(matches, key = lambda x: x.distance)
    // matches.sort((a: any, b: any) => a.distance - b.distance);
    // const good = matches.slice(0, Math.trunc(matches.length * 0.15))
    // // good = matches[: int(len(matches) * 0.15)]
    // const src_pts=kpA
    // src_pts = np.float32([kpA[m.queryIdx].pt for m in good]).reshape(-1, 1, 2)
    // dst_pts = np.float32([kpB[m.trainIdx].pt for m in good]).reshape(-1, 1, 2)
    // M, mask = cv.findHomography(dst_pts, src_pts, cv.RANSAC, 5.0)
    // imgB_transform = cv.warpPerspective(imgB, M, (wA, hA))

    cv.absdiff(grayA, grayB, result);
    cv.cvtColor(result, result, cv.COLOR_BGR2GRAY);
    setLoad("二値化");
    cv.threshold(result, result, 0, 255, cv.THRESH_BINARY + cv.THRESH_OTSU);
    setLoad("ノイズ除去");

    let kernel = cv.Mat.ones(2, 2, cv.CV_8U);
    let anchor = new cv.Point(-1, -1);
    cv.morphologyEx(result, result, cv.MORPH_OPEN, kernel, anchor, 1,
      cv.BORDER_CONSTANT, cv.morphologyDefaultBorderValue());

    const contours = new cv.MatVector();
    const hierarchy = new cv.Mat();
    setLoad("輪郭抽出");
    cv.findContours(result, contours, hierarchy, cv.RETR_EXTERNAL, cv.CHAIN_APPROX_SIMPLE, {
      x: 0,
      y: 0
    });
    const addWeightedMat = new cv.Mat();
    const convert = new cv.Mat();
    cv.cvtColor(imgA, convert, cv.COLOR_RGBA2RGB);
    const baseImage = convert.clone();
    // cv.convertScaleAbs(baseImage, baseImage, 0.7, 0);
    for (let i = 0; i < contours.size(); i++) {
      const cnt = contours.get(i);
      const rect = cv.boundingRect(cnt);
      if (rect.width > 1 && rect.height > 1) {
        console.log(rect.x + "," + rect.y + "," + rect.width + "," + rect.height);
        cv.rectangle(convert, new cv.Point(rect.x, rect.y), new cv.Point(rect.x + rect.width, rect.y + rect.height), new cv.Scalar(0, 0, 255), -1, cv.LINE_8, 0);
        cv.addWeighted(baseImage, 0.3, convert, 0.7, 2.2, addWeightedMat);
      }
    }
    setLoad("完了");
    cv.imshow('canvasOutput3', addWeightedMat);
  }

  return (
    <div style={{
      backgroundColor: '#FFFFFF',
      borderRadius: "1vw",
      boxShadow: " 0px 3px 6px #00000029",
      width: "98vw",
      margin: "0 auto",
    }}>
      <Grid container alignItems="center" justifyContent="center" spacing={3}>
        {(status === "select1" || status === "select2") && <Grid item xs={12}><h2 className='japanese_L' style={{ textAlign: "center" as "center" }}>2枚の画像をそれぞれアップロードしてください</h2></Grid>}
        {(status === "edit") && <Grid item xs={12}><h2 className='japanese_L' style={{ textAlign: "center" as "center" }}>詳細設定</h2></Grid>}
        <Grid item xs={2}></Grid>
        <Grid item xs={4}>
          {<UploadFile setFile={(file) => {
            if (file && file[0]) {
              const img = new Image()
              img.onload = () => {
                setStatus("select2");
                imgA = cv.imread(img)
                cv.imshow('canvasOutput', imgA)
              }
              img.src = URL.createObjectURL(file[0])
            }
          }} status={status} id={"canvasOutput"} />
          }
        </Grid>
        <Grid item xs={4}>

          {<UploadFile setFile={(file) => {
            if (file && file[0]) {
              const img = new Image()
              img.onload = () => {
                setStatus("edit");
                imgB = cv.imread(img)
                cv.imshow('canvasOutput2', imgB)
              }
              img.src = URL.createObjectURL(file[0])
            }
          }} status={status} id={"canvasOutput2"} />
          }
        </Grid>
        <Grid item xs={2}></Grid>

      </Grid>


      <canvas id="canvasOutput3"></canvas>

      <Button onClick={buttonClick}>Click</Button>
    </div>
  );
}

interface Upload {
  setFile: (file: File[]) => void;
  status: Status;
  id: string;
}
const UploadFile = (props: Upload) => {
  const style = {
    width: "30vw",
    height: "30vw",
    boxShadow: "inset 0px 3px 6px #00000029, 0px 3px 6px #00000029",
  };
  const onDrop = useCallback((acceptedFiles: any) => {
    props.setFile(acceptedFiles);
  }, []);
  const { getRootProps, getInputProps, isDragActive, open } = useDropzone({ onDrop });
  // useEffect(() => {
  //   // cv.imshow('canvasOutput', imgA);
  // }, []);
  return (
    <div>
      <div {...getRootProps()} style={{
        width: "30vw",
        height: "30vw",
        boxShadow: "inset 0px 3px 6px #00000029, 0px 3px 6px #00000029",
        position: "relative",
        marginTop: "1vw",
        borderRadius: "1vw"
      }}>
        <input {...getInputProps()} />
        {
          isDragActive ?
            <div style={{
              position: "absolute",
              backgroundColor: "rgba(0,0,0,0.5)",
              width: "100%",
              height: "100%",
              top: 0,
              left: 0,
              borderRadius: "1vw"

            }} >
              <div><p className="japanese_L" style={{ textAlign: "center" as "center" }}>アップロード！</p></div> </div> :
            <div style={{
              position: "absolute",
              width: "100%",
              height: "100%",

            }} >

              <Button onClick={open} variant="contained" style={{
                margin: "auto", padding: "1vw 1.5vw", marginTop: "11vh", backgroundColor: "#5BC0C4", textAlign: "center" as "center", position: 'absolute', left: '50%', top: '4%',
                transform: 'translate(-50%, -50%)'
              }}>
                <div className="japanese_B">ファイルを選択</div></Button>

              <div><p className="japanese_L" style={{ textAlign: "center" as "center", position: 'absolute', left: '50%', top: '50%', transform: 'translate(-50%, -50%)' }}>

                <br />
                <b className='japanese_B' style={{ fontSize: "2vw" }}>or</b>
                <br />
                <br />
                ファイルをここに
                <br />
                <b style={{ color: "#5BC0C4" }}>ドラッグ&ドロップ</b>してください</p></div>
              <canvas style={{
                position: "absolute",
                width: "100%",
                height: "100%",
                top: 0,
                left: 0,
                borderRadius: "1vw"
              }} id={props.id} ></canvas>
            </div>
        }
      </div>

    </div >
  )
}

export default App;
